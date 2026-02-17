export interface ValidateMemberRequest {
  UserSessionId: string;
  MemberId: string;
}

export interface ValidateMemberResponse {
  Result: number;
  ErrorDescription?: string;
}
