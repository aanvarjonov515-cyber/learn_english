import { test, describe } from 'node:test';
import assert from 'node:assert';
import { 
  getReadingDocuments, 
  saveReadingDocument, 
  deleteReadingDocument 
} from '../services/storage';
import { ReadingDocument } from '../types';

describe('Reader Storage: Document Deletion', () => {
  test('should delete a document and update storage', () => {
    const docId = `test_doc_${Date.now()}`;
    const newDoc: ReadingDocument = {
      id: docId,
      ownerId: 'test_user',
      title: 'Test Doc',
      text: 'Test content',
      wordCount: 2,
      contentVersion: 1,
      processingStatus: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveReadingDocument(newDoc);
    
    let docs = getReadingDocuments();
    assert.ok(docs.some(d => d.id === docId), 'Document should exist');

    deleteReadingDocument(docId);
    
    docs = getReadingDocuments();
    assert.ok(!docs.some(d => d.id === docId), 'Document should be deleted');
  });
});
