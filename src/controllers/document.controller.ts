import { Request, Response } from 'express';
import Document from '../models/document.model';

export class DocumentController {
  async getAllDocuments(req: Request, res: Response) {
    try {
      const documents = await Document.find();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching documents', error });
    }
  }

  async getDocumentById(req: Request, res: Response) {
    try {
      const document = await Document.findById(req.params.id);
      if (!document) return res.status(404).json({ message: 'Document not found' });
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching document', error });
    }
  }

  async uploadDocument(req: Request, res: Response) {
    try {
      const { name, url } = req.body;
      const newDocument = new Document({ name, url, uploadedBy: req.user.id });
      await newDocument.save();
      res.status(201).json(newDocument);
    } catch (error) {
      res.status(500).json({ message: 'Error uploading document', error });
    }
  }

  async deleteDocument(req: Request, res: Response) {
    try {
      const deletedDocument = await Document.findByIdAndDelete(req.params.id);
      if (!deletedDocument) return res.status(404).json({ message: 'Document not found' });
      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting document', error });
    }
  }
}
