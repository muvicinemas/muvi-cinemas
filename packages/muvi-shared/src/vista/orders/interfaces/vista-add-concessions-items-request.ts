export interface VistaAddConcessionItemsRequest {
  UserSessionId: string;
  CinemaId: string;
  SessionId?: string;
  ReturnOrder: boolean;
  LinkedBookingId?: string;
  Concessions: ConcessionItem[];
  ReplaceExistingConcessions: boolean;
  InSeatOrderDeliveryInfo?: {
    Comment?: string;
    DeliveryWindowValue: string;
  };
}

export interface PackageChildItem {
  Id: string;
  ItemId: string;
  Quantity: number;
  NameAr?: string;
  NameEn?: string;
  ParentSaleItem?: ParentSaleItem;
  Modifiers?: Modifiers[];
}

export interface ConcessionItem {
  Id: string;
  ItemId: string;
  Quantity: number;
  ParentSaleItem?: ParentSaleItem;
  PackageChildItems?: PackageChildItem[];
  DeliveryOption?: number;
  DeliveryInfo?: DeliveryInfo;
  Modifiers?: Modifiers[];
  FinalPriceCents?: number;
  TaxCents?: number;
  NameAr?: string;
  NameEn?: string;
  ImageUrl?: string;
}

export interface Modifiers {
  ModifierItemId: string;
  NameAr?: string;
  NameEn?: string;
  FinalPriceCents?: number;
  TaxCents?: number;
}

export interface ParentSaleItem {
  ItemId: string;
  NameAr?: string;
  NameEn?: string;
  ImageUrl?: string;
}

export interface DeliveryInfo {
  Seats: Position[];
  DeliveryWindowValue: string;
}

export interface Position {
  RowId: string;
  SeatNumber: string;
  ColumnIndex: string;
  RowIndex: string;
  AreaNumber: string;
}
