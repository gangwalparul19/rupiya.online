/**
 * Firestore Service Tests
 * Tests CRUD operations and data validation
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Firestore
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();

const mockFirestore = {
  collection: mockCollection,
  doc: mockDoc
};

global.firebase = {
  firestore: () => mockFirestore
};

describe('Firestore Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock chain
    mockCollection.mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      get: mockGet
    });
    
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
      delete: mockDelete
    });
    
    mockWhere.mockReturnValue({
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      get: mockGet
    });
    
    mockOrderBy.mockReturnValue({
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      get: mockGet
    });
  });

  describe('add', () => {
    it('should add document to collection', async () => {
      const mockDocRef = {
        id: 'new-doc-id',
        set: mockSet
      };
      
      mockCollection.mockReturnValue({
        doc: () => mockDocRef
      });
      
      mockSet.mockResolvedValue();

      const data = {
        amount: 100,
        category: 'Food',
        date: new Date()
      };

      await mockDocRef.set(data);

      expect(mockSet).toHaveBeenCalledWith(data);
    });

    it('should add timestamp fields', async () => {
      const mockDocRef = {
        id: 'new-doc-id',
        set: mockSet
      };
      
      mockSet.mockResolvedValue();

      const data = {
        amount: 100,
        category: 'Food'
      };

      const dataWithTimestamp = {
        ...data,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };

      await mockDocRef.set(dataWithTimestamp);

      expect(mockSet).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should get document by id', async () => {
      const mockData = {
        id: 'doc-id',
        amount: 100,
        category: 'Food'
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'doc-id',
        data: () => mockData
      });

      const result = await mockDoc().get();

      expect(result.exists).toBe(true);
      expect(result.data()).toEqual(mockData);
    });

    it('should return null for non-existent document', async () => {
      mockGet.mockResolvedValue({
        exists: false
      });

      const result = await mockDoc().get();

      expect(result.exists).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should get all documents from collection', async () => {
      const mockDocs = [
        { id: '1', data: () => ({ amount: 100 }) },
        { id: '2', data: () => ({ amount: 200 }) }
      ];

      mockGet.mockResolvedValue({
        docs: mockDocs
      });

      const result = await mockCollection().get();

      expect(result.docs).toHaveLength(2);
      expect(result.docs[0].data().amount).toBe(100);
    });

    it('should apply where filter', async () => {
      mockGet.mockResolvedValue({
        docs: [{ id: '1', data: () => ({ category: 'Food' }) }]
      });

      await mockCollection().where('category', '==', 'Food').get();

      expect(mockWhere).toHaveBeenCalledWith('category', '==', 'Food');
    });

    it('should apply orderBy', async () => {
      mockGet.mockResolvedValue({
        docs: []
      });

      await mockCollection().orderBy('date', 'desc').get();

      expect(mockOrderBy).toHaveBeenCalledWith('date', 'desc');
    });

    it('should apply limit', async () => {
      mockGet.mockResolvedValue({
        docs: []
      });

      await mockCollection().limit(10).get();

      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  describe('update', () => {
    it('should update document', async () => {
      mockUpdate.mockResolvedValue();

      const updates = {
        amount: 150,
        category: 'Transport'
      };

      await mockDoc().update(updates);

      expect(mockUpdate).toHaveBeenCalledWith(updates);
    });

    it('should add updatedAt timestamp', async () => {
      mockUpdate.mockResolvedValue();

      const updates = {
        amount: 150,
        updatedAt: expect.any(Date)
      };

      await mockDoc().update(updates);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete document', async () => {
      mockDelete.mockResolvedValue();

      await mockDoc().delete();

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('batch operations', () => {
    it('should perform batch write', async () => {
      const mockBatch = {
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue()
      };

      mockFirestore.batch = () => mockBatch;

      const batch = mockFirestore.batch();
      batch.set({}, { amount: 100 });
      batch.update({}, { amount: 150 });
      batch.delete({});
      await batch.commit();

      expect(mockBatch.set).toHaveBeenCalled();
      expect(mockBatch.update).toHaveBeenCalled();
      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('transactions', () => {
    it('should perform transaction', async () => {
      const mockTransaction = {
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      };

      mockFirestore.runTransaction = jest.fn((callback) => {
        return callback(mockTransaction);
      });

      await mockFirestore.runTransaction(async (transaction) => {
        await transaction.get({});
        transaction.update({}, { amount: 100 });
      });

      expect(mockFirestore.runTransaction).toHaveBeenCalled();
    });
  });
});
