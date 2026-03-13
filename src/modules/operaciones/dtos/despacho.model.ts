export interface OperTDespacho {
    id?: number;
    cliente?: string;
    nPedido?: string;    
    docsFechaIni?: string;
    docsFechaFin?: string;
    fechaInspeccion?: string;
    fechaDespacho?: string;
    fechaRegistro?: string;
    nGuia?: string;
    nFactura?: string;
    cantidadCodigos?: number;
    cantCodigosRevisados?: number;
    transportistaNombre?: string;
    transporteNombre?: string;
    responsableDespacho?: string;
    inspeccionRealizadaPor?: string;
    inspeccionAprobadaPor?: string;
    observaciones?: string;    
    cliruc?: string;
    usuarioRegistro?: string;
    atributos?: OperDDespacho[];
}

export interface OperDDespacho {
    id?: number;
    atrId?: number;
    padreId?: number;
    nItem?: number;
    opPo?: string;
    codigo?: string;
    descripcion?: string;
    cantidadUnidades?: number;
    cantidadInspeccionada?: number;
    lote?: string;
    puntosAInspeccionar?: string;
    calidadProducto?: string;
    calidadObservacion?: string;
    pickingRealizadoPor_?: string[];
    pickingRevisadoPor_?: string[];
    packingRealizadoPor_?: string[];
    packingRevisadoPor_?: string[];
    pickingRealizadoPor?: string;
    pickingRevisadoPor?: string;
    packingRealizadoPor?: string;
    packingRevisadoPor?: string;
    estadoInspeccion?: string;
    estadoLinea?: string;
    evidenciaFotoUrl?: string;
    evidenciaFotoNotas?: string;
    fechaRegistro?: string;
    photoPath?: string;
    photoFile?: any;
    photoFormat?: string;
    photoName?: string;
    foto?: any;

    opPos?: string[];
    lotes?: string[];
}
