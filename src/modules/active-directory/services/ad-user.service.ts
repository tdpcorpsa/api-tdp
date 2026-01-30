import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ldap from 'ldapjs';

export enum AccountState {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
}

@Injectable()
export class AdUserService {
  // Marca de pendiente
  private static readonly PENDING_MARK_ATTR = 'info';
  private static readonly PENDING_MARK_VALUE = 'PENDING_EMAIL';

  private readonly ldapUrl: string;
  private readonly baseDN: string;
  private readonly domain: string;
  private readonly adminUser: string;
  private readonly adminPassword: string;
  private readonly tlsRejectUnauthorized: boolean;

  constructor(private readonly config: ConfigService) {
    this.ldapUrl = this.must('LDAP_URL');
    this.baseDN = this.must('LDAP_BASE_DN');
    this.domain = this.must('LDAP_DOMAIN');
    this.adminUser = this.must('LDAP_ADMIN_USER');
    this.adminPassword = this.must('LDAP_ADMIN_PASSWORD');

    const v = (this.config.get<string>('LDAP_TLS_REJECT_UNAUTHORIZED') ?? 'true').toLowerCase();
    this.tlsRejectUnauthorized = v !== 'false';
  }

  private must(key: string): string {
    const v = this.config.get<string>(key);
    if (!v) throw new Error(`Falta variable de entorno: ${key}`);
    return v;
  }

  /* ===========================
     Cliente / Bind
     =========================== */

  private createClient(): ldap.Client {
    const isLdaps = this.ldapUrl.toLowerCase().startsWith('ldaps://');
    return ldap.createClient({
      url: this.ldapUrl,
      timeout: 30_000,
      connectTimeout: 30_000,
      reconnect: true,
      ...(isLdaps
        ? {
            tlsOptions: {
              rejectUnauthorized: this.tlsRejectUnauthorized,
            },
          }
        : {}),
    });
  }

  private bind(client: ldap.Client, username: string, password: string): Promise<void> {
    const principal = `${username}@${this.domain}`;
    return new Promise((resolve, reject) => {
      client.bind(principal, password, (err) => (err ? reject(err) : resolve()));
    });
  }

  private async withAdminClient<T>(fn: (client: ldap.Client) => Promise<T>): Promise<T> {
    const client = this.createClient();
    try {
      await this.bind(client, this.adminUser, this.adminPassword);
      return await fn(client);
    } finally {
      client.unbind(() => void 0);
    }
  }

  private async withUserClient<T>(username: string, password: string, fn: (client: ldap.Client) => Promise<T>): Promise<T> {
    const client = this.createClient();
    try {
      await this.bind(client, username, password);
      return await fn(client);
    } finally {
      client.unbind(() => void 0);
    }
  }

  /* ===========================
     Validar Credenciales
     =========================== */

  async validateCredentials(username: string, password: string): Promise<boolean> {
    try {
      await this.withUserClient(username, password, async () => {
        // Si el bind funciona, las credenciales son válidas
        return true;
      });
      return true;
    } catch (err) {
      if (err.name === 'InvalidCredentialsError' || err.name === 'OperationsError') {
         return false;
      }
      // Otros errores (timeout, conexión, etc) los relanzamos
      throw err;
    }
  }

  /* ===========================
     Operaciones LDAP (promises)
     =========================== */

  private searchOne(client: ldap.Client, base: string, options: ldap.SearchOptions): Promise<ldap.SearchEntry | null> {
    return new Promise((resolve, reject) => {
      client.search(base, options, (err, res) => {
        if (err) return reject(err);
        let found: ldap.SearchEntry | null = null;

        res.on('searchEntry', (entry) => {
          if (!found) found = entry;
        });
        res.on('error', (e) => reject(e));
        res.on('end', () => resolve(found));
      });
    });
  }

  private add(client: ldap.Client, dn: string, entry: Record<string, any>): Promise<void> {
    return new Promise((resolve, reject) => {
      client.add(dn, entry, (err) => (err ? reject(err) : resolve()));
    });
  }

  private del(client: ldap.Client, dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      client.del(dn, (err) => (err ? reject(err) : resolve()));
    });
  }

  private modify(client: ldap.Client, dn: string, changes: ldap.Change | ldap.Change[]): Promise<void> {
    return new Promise((resolve, reject) => {
      client.modify(dn, changes as any, (err) => (err ? reject(err) : resolve()));
    });
  }

  /* ===========================
     Helpers de escape
     =========================== */

  private escapeFilter(input: string): string {
    // RFC4515 (similar a tu Java)
    return (input ?? '').replace(/\\/g, '\\5c')
      .replace(/\*/g, '\\2a')
      .replace(/\(/g, '\\28')
      .replace(/\)/g, '\\29')
      .replace(/\0/g, '\\00');
  }

  private escapeDnValue(value: string): string {
    // Escape básico para DN (CN=...)
    // (suficiente para usernames comunes; si necesitas full RFC4514, te lo ajusto)
    return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/\+/g, '\\+').replace(/"/g, '\\"')
      .replace(/</g, '\\<').replace(/>/g, '\\>').replace(/;/g, '\\;').trim();
  }

  /* ===========================
     Buscar DN de usuario
     =========================== */

  private async findUserDN(client: ldap.Client, username: string): Promise<string> {
    const filter = `(&(objectClass=user)(sAMAccountName=${this.escapeFilter(username)}))`;

    const entry = await this.searchOne(client, this.baseDN, {
      scope: 'sub',
      filter,
      attributes: ['distinguishedName'],
    });

    if (!entry) throw new NotFoundException(`Usuario no encontrado: ${username}`);

    // ldapjs entrega DN en entry.dn
    return entry.dn.toString();
  }

  /* ===========================
     OU helpers
     =========================== */

  private resolveBaseOU(userType?: string): string {
    const t = (userType ?? '').trim().toLowerCase();
    switch (t) {
      case 'trabajador':
      case 'trabajadores':
      case 'interno':
        return `OU=Trabajadores,${this.baseDN}`;
      case 'externo':
      case 'externos':
        return `OU=Externos,${this.baseDN}`;
      case 'proveedor':
      case 'proveedores':
        return `OU=Proveedores,${this.baseDN}`;
      default:
        return `OU=Usuarios,${this.baseDN}`;
    }
  }

  private async dnExists(client: ldap.Client, dn: string): Promise<boolean> {
    try {
      const entry = await this.searchOne(client, dn, { scope: 'base', filter: '(objectClass=*)', attributes: ['dn'] });
      return !!entry;
    } catch (err) {
      if (err.name === 'NoSuchObjectError') {
        return false;
      }
      throw err;
    }
  }

  private async ensureOuPathExists(client: ldap.Client, ouDn: string): Promise<void> {
    const baseLower = this.baseDN.toLowerCase();
    const ouLower = ouDn.toLowerCase();

    if (!ouLower.endsWith(baseLower)) {
      throw new InternalServerErrorException(`El DN de la OU debe terminar en ${this.baseDN}. Recibí: ${ouDn}`);
    }

    // Parte relativa antes de baseDN: "OU=X,OU=Y,"
    let relative = ouDn.substring(0, ouDn.length - this.baseDN.length);
    if (relative.endsWith(',')) relative = relative.slice(0, -1);
    if (!relative) return;

    // split por comas no escapadas (similar a tu regex Java)
    const rdns = relative.split(/(?<!\\),/).map((s) => s.trim());

    // Vamos desde la OU más cercana a baseDN hacia arriba
    let parent = this.baseDN;
    for (let i = rdns.length - 1; i >= 0; i--) {
      const rdn = rdns[i];
      if (!rdn.toUpperCase().startsWith('OU=')) {
        parent = `${rdn},${parent}`;
        continue;
      }

      const dn = `${rdn},${parent}`;
      const exists = await this.dnExists(client, dn);
      if (!exists) {
        const ouValue = rdn.substring(3);
        await this.add(client, dn, {
          objectClass: ['top', 'organizationalUnit'],
          ou: ouValue,
        });
      }
      parent = dn;
    }
  }

  /* ===========================
     Crear usuario (equivalente Java)
     =========================== */

  async createUser(
    username: string,
    password: string,
    givenName: string | null,
    sn: string | null,
    mail: string | null,
    userType: string,
    initialState: AccountState = AccountState.ACTIVE,
    forcePwdChangeOnFirstLogon = false,
  ): Promise<void> {
    return this.withAdminClient(async (client) => {
      try {
        const baseOU = this.resolveBaseOU(userType);
        await this.ensureOuPathExists(client, baseOU);

        const escapedCN = this.escapeDnValue(username);
        const userDN = `CN=${escapedCN},${baseOU}`;

        // UAC base: NORMAL_ACCOUNT = 512
        let uac = 512;
        if (initialState !== AccountState.ACTIVE) uac |= 0x0002; // ACCOUNTDISABLE

        const displayName = `${givenName ?? ''} ${sn ?? ''}`.trim();

        // Añadir entrada (ldapjs usa objetos planos)
        const entry: Record<string, any> = {
          objectClass: ['top', 'person', 'organizationalPerson', 'user'],
          cn: username,
          sAMAccountName: username,
          userPrincipalName: `${username}@${this.domain}`,
          displayName,
          userAccountControl: String(uac),
        };

        if (givenName) entry.givenName = givenName;
        if (sn) entry.sn = sn;
        if (mail && mail.trim()) entry.mail = mail.trim();

        if (initialState === AccountState.PENDING_CONFIRMATION) {
          entry[AdUserService.PENDING_MARK_ATTR] = AdUserService.PENDING_MARK_VALUE;
        }

        await this.add(client, userDN, entry);

        // Password (LDAPS requerido)
        try {
          await this.setPasswordAdmin(username, password);
        } catch (pwdErr) {
          console.error("Error setting password for user " + username, pwdErr);
          // Opcional: ¿borrar el usuario si falla el password?
        }

        if (forcePwdChangeOnFirstLogon) {
          await this.replaceOrRemoveAttr(client, userDN, 'pwdLastSet', '0');
        }

        // Limpiar atributos no deseados (igual que tu Java)
        await this.removeAttrIfPresent(client, userDN, 'homeDirectory');
        await this.removeAttrIfPresent(client, userDN, 'homeDrive');
        await this.removeAttrIfPresent(client, userDN, 'profilePath');
        await this.removeAttrIfPresent(client, userDN, 'unixHomeDirectory');
        await this.removeAttrIfPresent(client, userDN, 'loginShell');

        // Si ACTIVE, habilitar (en caso de que AD cree disabled por defecto)
        if (initialState === AccountState.ACTIVE) {
          await this.enableUser(username);
        }
      } catch (err) {
        console.error("Error creating user in AD Service:", err);
        throw err;
      }
    });
  }

  /* ===========================
     Activar luego de confirmación email
     =========================== */

  async activateAfterEmailConfirmation(username: string): Promise<void> {
    return this.withAdminClient(async (client) => {
      const dn = await this.findUserDN(client, username);

      const uac = await this.readIntAttr(client, dn, 'userAccountControl');
      const current = uac ?? 512;
      const newUac = current & ~0x0002; // limpia ACCOUNTDISABLE
      await this.replaceOrRemoveAttr(client, dn, 'userAccountControl', String(newUac));

      // eliminar marca pendiente si existe
      await this.removeAttrIfPresent(client, dn, AdUserService.PENDING_MARK_ATTR);
    });
  }

  /* ===========================
     Eliminar usuario
     =========================== */

  async deleteUser(username: string): Promise<void> {
    return this.withAdminClient(async (client) => {
      const dn = await this.findUserDN(client, username);
      await this.del(client, dn);
    });
  }

  /* ===========================
     Password
     =========================== */

  async setPasswordAdmin(username: string, newPassword: string): Promise<void> {
    return this.withAdminClient(async (client) => {
      const dn = await this.findUserDN(client, username);

      const quoted = `"${newPassword}"`;
      const pwdBytes = Buffer.from(quoted, 'utf16le');

      const change = new ldap.Change({
        operation: 'replace',
        modification: {
          type: 'unicodePwd',
          values: [pwdBytes]
        },
      });

      await this.modify(client, dn, change);
    });
  }

  async changePasswordUser(username: string, oldPassword: string, newPassword: string): Promise<void> {
    return this.withUserClient(username, oldPassword, async (client) => {
      const dn = await this.findUserDN(client, username);

      const oldBytes = Buffer.from(`"${oldPassword}"`, 'utf16le');
      const newBytes = Buffer.from(`"${newPassword}"`, 'utf16le');

      const changes = [
        new ldap.Change({
          operation: 'delete',
          modification: { type: 'unicodePwd', values: [oldBytes] }
        }),
        new ldap.Change({
          operation: 'add',
          modification: { type: 'unicodePwd', values: [newBytes] }
        }),
      ];

      await this.modify(client, dn, changes);
    });
  }

  async adminResetPasswordHard(username: string, newPassword: string): Promise<void> {
    return this.withAdminClient(async (client) => {
      const dn = await this.findUserDN(client, username);

      const tmp = `${cryptoRandom()}!`;
      await this.modify(client, dn, new ldap.Change({
        operation: 'replace',
        modification: {
          type: 'unicodePwd',
          values: [Buffer.from(`"${tmp}"`, 'utf16le')]
        }
      }));

      await this.modify(client, dn, new ldap.Change({
        operation: 'replace',
        modification: {
          type: 'unicodePwd',
          values: [Buffer.from(`"${newPassword}"`, 'utf16le')]
        }
      }));

      const changes = [
        new ldap.Change({
          operation: 'replace',
          modification: { type: 'pwdLastSet', values: ['-1'] }
        }),
        new ldap.Change({
          operation: 'replace',
          modification: { type: 'lockoutTime', values: ['0'] }
        }),
      ];
      await this.modify(client, dn, changes);
    });
  }

  /* ===========================
     Enable / Disable
     =========================== */

  async enableUser(username: string): Promise<void> {
    return this.withAdminClient(async (client) => {
      const dn = await this.findUserDN(client, username);
      const uac = (await this.readIntAttr(client, dn, 'userAccountControl')) ?? 512;
      const newUac = uac & ~0x0002;
      await this.replaceOrRemoveAttr(client, dn, 'userAccountControl', String(newUac));
    });
  }

  async disableUser(username: string): Promise<void> {
    return this.withAdminClient(async (client) => {
      const dn = await this.findUserDN(client, username);
      const uac = (await this.readIntAttr(client, dn, 'userAccountControl')) ?? 512;
      const newUac = uac | 0x0002;
      await this.replaceOrRemoveAttr(client, dn, 'userAccountControl', String(newUac));
    });
  }

  /* ===========================
     Update attrs / Get user
     =========================== */

  async updateUserAttributes(username: string, attributes: Record<string, any>): Promise<void> {
    return this.withAdminClient(async (client) => {
      const dn = await this.findUserDN(client, username);

      for (const [attr, rawVal] of Object.entries(attributes)) {
        let val: any = rawVal;
        if (typeof val === 'string' && val.trim() === '') val = null;
        await this.replaceOrRemoveAttr(client, dn, attr, val);
      }
    });
  }

  async getUser(username: string, requestedAttrs?: string[]): Promise<Record<string, any>> {
    return this.withAdminClient(async (client) => {
      const dn = await this.findUserDN(client, username);

      const entry = await this.searchOne(client, dn, {
        scope: 'base',
        filter: '(objectClass=*)',
        attributes: requestedAttrs && requestedAttrs.length ? requestedAttrs : undefined,
      });

      if (!entry) throw new NotFoundException(`Usuario no encontrado: ${username}`);
      return entry.attributes.reduce<Record<string, any>>((acc, a) => {
        acc[a.type] = a.values;
        return acc;
      }, { dn });
    });
  }

  /* ===========================
     Attr helpers
     =========================== */

  private async readIntAttr(client: ldap.Client, dn: string, attrName: string): Promise<number | null> {
    const entry = await this.searchOne(client, dn, { scope: 'base', filter: '(objectClass=*)', attributes: [attrName] });
    if (!entry) return null;

    const attr = entry.attributes.find((a) => a.type === attrName);
    if (!attr || !attr.values?.length) return null;
    const v = Array.isArray(attr.values) ? attr.values[0] : attr.values;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
  }

  private async replaceOrRemoveAttr(client: ldap.Client, dn: string, attrName: string, value: any): Promise<void> {
    try {
      if (value === null || value === undefined) {
        await this.modify(client, dn, new ldap.Change({
          operation: 'delete',
          modification: {
            type: attrName,
            values: []
          }
        }));
      } else {
        await this.modify(client, dn, new ldap.Change({
          operation: 'replace',
          modification: {
            type: attrName,
            values: [value]
          }
        }));
      }
    } catch {
      // Igual que tu Java: si no existe al borrar, lo ignoramos
    }
  }

  private async removeAttrIfPresent(client: ldap.Client, dn: string, attrName: string): Promise<void> {
    try {
      await this.modify(client, dn, new ldap.Change({
        operation: 'delete',
        modification: {
          type: attrName,
          values: []
        }
      }));
    } catch {
      // ignore
    }
  }
}

function cryptoRandom(): string {
  // UUID simple sin dependencia externa
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
