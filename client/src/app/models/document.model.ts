export interface uploadDocument{
    documentType: string, // Corrected property name
    file: File,
    isSave: boolean
}