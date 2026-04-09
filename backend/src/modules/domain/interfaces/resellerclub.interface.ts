// ─── ResellerClub API Response Interfaces ────────────────────────────────────

/** Generic error response returned by ResellerClub when an API call fails. */
export interface RCErrorResponse {
  status: 'ERROR' | 'error';
  message: string;
  error?: string;
}

/** Availability status for a single domain TLD check. */
export interface RCAvailabilityStatus {
  [domainKey: string]: {
    classkey?: string;
    status: 'available' | 'regthroughus' | 'regthroughothers' | 'unknown';
  };
}

/** Bulk availability check response — keyed by "domain.tld". */
export interface RCAvailabilityResponse {
  [domainKey: string]: {
    classkey?: string;
    status: 'available' | 'regthroughus' | 'regthroughothers' | 'unknown';
  };
}

/** Single domain suggestion returned by the suggest-names API. */
export interface RCSuggestion {
  domain_name: string;
  status: string;
  score?: number;
}

/** Response from the domain suggest-names endpoint. */
export type RCSuggestNamesResponse = RCSuggestion[];

/** Contact details required by ResellerClub for domain registration. */
export interface RCContactParams {
  name: string;
  company: string;
  email: string;
  'address-line-1': string;
  'address-line-2'?: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  'phone-cc': string;
  phone: string;
  type: 'Contact' | 'CoopContact' | 'UkContact' | 'EuContact' | 'CnContact' | 'CoContact' | 'CaContact' | 'DeContact' | 'EsContact';
  'customer-id': string;
}

/** Response after creating a contact. */
export interface RCContactResponse {
  status: string;
  entityid?: string;
  [key: string]: unknown;
}

/** Registration request parameters for a domain. */
export interface RCRegisterDomainParams {
  'domain-name': string;
  years: number;
  ns: string[];
  'customer-id': string;
  'reg-contact-id': string;
  'admin-contact-id': string;
  'tech-contact-id': string;
  'billing-contact-id': string;
  'invoice-option': 'NoInvoice' | 'PayInvoice' | 'KeepInvoice' | 'OnlyAdd';
  'purchase-privacy'?: boolean;
  'protect-privacy'?: boolean;
  'auto-renew'?: boolean;
}

/** Response returned after successfully registering a domain. */
export interface RCRegisterDomainResponse {
  status: string;
  entityid?: string;
  actiontypedesc?: string;
  description?: string;
  actiontype?: string;
  actionstatus?: string;
  eaqid?: number;
  [key: string]: unknown;
}

/** Full domain order details returned by ResellerClub. */
export interface RCDomainDetails {
  entityid: string;
  orderid: string;
  description: string;
  currentstatus: string;
  domainname: string;
  endtime: string;
  creationtime: string;
  creationdt: string;
  enddt: string;
  ns1?: string;
  ns2?: string;
  ns3?: string;
  ns4?: string;
  cns?: Record<string, string>;
  classkey: string;
  customerId: string;
  noOfNameServers: number;
  isprivacyprotected?: string;
  isOrderSuspendedUponExpiry?: string;
  islockedByRegistrar?: boolean;
  orderSuspendedByParent?: string;
  domainstatus: string[];
  raaVerificationStatus?: string;
  raaVerificationStartTime?: string;
  moneybackperiod?: number;
  orderstatus: string[];
  actioncompleted?: string;
  [key: string]: unknown;
}

/** Renewal response from ResellerClub. */
export interface RCRenewResponse {
  status: string;
  entityid?: string;
  actiontypedesc?: string;
  description?: string;
  actiontype?: string;
  actionstatus?: string;
  invoiceid?: number;
  [key: string]: unknown;
}

/** DNS record as returned by ResellerClub DNS search. */
export interface RCDnsRecord {
  host: string;
  value: string;
  type: string;
  ttl: string;
  status?: string;
  priority?: string;
}

/** Response from DNS record search. */
export interface RCDnsSearchResponse {
  recsonpage: string;
  recsindb: string;
  [key: string]: RCDnsRecord | string;
}

/** Customer creation parameters. */
export interface RCCreateCustomerParams {
  username: string;
  passwd: string;
  name: string;
  company: string;
  'address-line-1': string;
  'address-line-2'?: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  'phone-cc': string;
  phone: string;
  'lang-pref': string;
}

/** Customer details response. */
export interface RCCustomerDetails {
  customerid: string;
  username: string;
  name: string;
  company: string;
  resellerid: string;
  parentid: string;
  [key: string]: unknown;
}

/** Domain order search response. */
export interface RCSearchOrdersResponse {
  recsonpage: number;
  recsindb: number;
  [key: string]: RCDomainDetails | number;
}

/** Pricing structure from ResellerClub. */
export interface RCPricingResponse {
  [productKey: string]: {
    addnewdomain?: Record<string, string>;
    renewdomain?: Record<string, string>;
    restoredomain?: Record<string, string>;
    [action: string]: Record<string, string> | undefined;
  };
}

/** Nameserver modification response. */
export interface RCNameserverResponse {
  status: string;
  [key: string]: unknown;
}

/** Theft protection / lock response. */
export interface RCLockResponse {
  status: string;
  [key: string]: unknown;
}

/** Privacy protection response. */
export interface RCPrivacyResponse {
  status: string;
  [key: string]: unknown;
}

// ─── Internal Domain Interfaces ──────────────────────────────────────────────

/** Normalised domain availability result used by the service layer. */
export interface DomainAvailabilityResult {
  domain: string;
  tld: string;
  available: boolean;
  status: string;
  classkey?: string;
}

/** Normalised domain suggestion used by the service layer. */
export interface DomainSuggestion {
  domain: string;
  available: boolean;
}

/** Normalised DNS record used by the controller layer. */
export interface DnsRecord {
  id?: string;
  type: string;
  host: string;
  value: string;
  ttl: number;
  priority?: number;
}

/** Shape of a domain record persisted in the local database. */
export interface DomainRecord {
  id: string;
  userId: string;
  domainName: string;
  tld: string;
  orderId: string;
  customerId: string;
  contactId: string;
  status: string;
  expiryDate: Date;
  autoRenew: boolean;
  privacyProtection: boolean;
  theftProtection: boolean;
  nameservers: string[];
  createdAt: Date;
  updatedAt: Date;
}
