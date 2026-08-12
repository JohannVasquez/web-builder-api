import type { ContactInput } from './ContactSchema';

export class ContactRequest {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly message: string,
    public readonly phone?: string,
  ) {}

  public static fromInput(input: ContactInput): ContactRequest {
    return new ContactRequest(input.name, input.email, input.message, input.phone);
  }
}
