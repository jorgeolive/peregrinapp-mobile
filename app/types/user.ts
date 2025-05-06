export interface User {
  id?: string;
  phoneNumber: string;
  nickname: string;
  dateOfBirth: string;
  bio?: string;
  isActivated: boolean;
  password?: string;
  sharePosition?: boolean;
  enableDms?: boolean;
  createdAt?: string;
} 