export type UserProfile = {
  id: number;
  authEmail: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  picture?: string | null;
};
