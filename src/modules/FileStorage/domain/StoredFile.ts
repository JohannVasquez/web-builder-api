export class StoredFile {
  constructor(
    public readonly key: string,
    public readonly url: string,
    public readonly mimeType: string,
    public readonly size: number,
  ) {}
}
