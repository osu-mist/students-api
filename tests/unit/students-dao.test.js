const appRoot = require('app-root-path');
const config = require('config');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const _ = require('lodash');
const sinon = require('sinon');

sinon.replace(config, 'get', () => ({ oracledb: {} }));
const conn = appRoot.require('api/v1/db/oracledb/connection');
const studentsDao = appRoot.require('api/v1/db/oracledb/students-dao');

chai.should();
chai.use(chaiAsPromised);

sinon.stub(conn, 'getConnection').resolves({
  execute: (sql) => {
    const sqlResults = {
      multiResults: { rows: [{}, {}] },
      singleResult: { rows: [{}] },
    };
    return sqlResults[sql];
  },
  close: () => {},
});

describe('Test students-dao', () => {
  describe('Test getResourceById', () => {
    const fakeId = 'fakeId';
    const fakeStudentsSerializer = rows => rows;
    const fakeParams = {};

    it('should be fulfilled if isSingleton is true and only get one result', () => {
      const fulfilledCases = [
        { fakeSql: () => 'singleResult', isSingleton: true, expectResult: 123 },
        { fakeSql: () => 'multiResults', isSingleton: false, expectResult: [{}, {}] },
        { fakeSql: () => 'singleResult', isSingleton: false, expectResult: [{}] },
      ];

      _.each(fulfilledCases, ({ fakeSql, isSingleton, expectResult }) => {
        const result = studentsDao.getResourceById(
          fakeId,
          fakeSql,
          fakeStudentsSerializer,
          isSingleton,
          fakeParams,
        );
        result.should.to.eventually.be.fulfilled.and.deep.equal(expectResult); // didn't fail correctly
      });
    });

    it('should to rejected if isSingleton is true but get multiple results', () => {
      const fakeSql = () => 'multiResults';
      const isSingleton = true;
      const expectResult = 'Expect a single object but got multiple results.';

      const result = studentsDao.getResourceById(
        fakeId,
        fakeSql,
        fakeStudentsSerializer,
        isSingleton,
        fakeParams,
      );
      return result.should.to.eventually.be.rejectedWith(expectResult).and.be.an.instanceOf(Error);
    });
  });
});
