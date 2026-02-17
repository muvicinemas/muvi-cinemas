export interface GetGroupedByTypeResponse {
    ResponseCode: number;
    ErrorDescription?: string;
    ConcessionTabs: ConcessionTab[];
}
export interface ConcessionTab {
    Id: number;
    Name: string;
    ConcessionItems: ConcessionItem[];
}
export interface PackageChildItem {
    Id: string;
    Quantity: number;
    Description: string;
    DescriptionAlt: string;
    ExtendedDescription: string;
    ExtendedDescriptionAlt: string;
    AlternateItems: AlternateItem[];
}
export interface ConcessionItem {
    Id: string;
    Description: string;
    DescriptionAlt: string;
    ExtendedDescription: string;
    ExtendedDescriptionAlt: string;
    PriceInCents: number;
    TaxInCents: number;
    AlternateItems: AlternateItem[];
    PackageChildItems: PackageChildItem[];
    ModifierGroups: ModifierGroup[];
}
export interface AlternateItem {
    Id: string;
    Description: string;
    DescriptionAlt: string;
    ExtendedDescription: string;
    ExtendedDescriptionAlt: string;
    PriceInCents: number;
    TaxInCents: number;
    ModifierGroups: ModifierGroup[];
}
export interface ModifierGroup {
    Id: string;
    Description: string;
    DescriptionAlt: string;
    ExtendedDescription: string;
    ExtendedDescriptionAlt: string;
    MaximumQuantity: number;
    MinimumQuantity: number;
    Modifiers: Modifier[];
}
export interface Modifier {
    Id: string;
    Description: string;
    DescriptionAlt: string;
    ExtendedDescription: string;
    ExtendedDescriptionAlt: string;
    PriceInCents: number;
    TaxInCents: number;
}
