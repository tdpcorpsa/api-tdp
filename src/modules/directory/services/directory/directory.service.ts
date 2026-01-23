import { Injectable } from '@nestjs/common';
import { AdUserService } from 'src/modules/active-directory/services/ad-user.service';

@Injectable()
export class DirectoryService {
  constructor(private readonly ad: AdUserService) {}

  async userExists(username: string): Promise<boolean> {
    try {
      // Si tienes getUser(), úsalo pidiendo un attr mínimo
      /*let rs = */await this.ad.getUser(username, 
        ['distinguishedName', "cn", "mail", "memberOf", "userAccountControl"]);
      //console.log(rs);
      return true;
    } catch {
      return false;
    }
  }

}
