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
const { any } = sinon.match;

sinon.stub(conn, 'getConnection').resolves({
  execute: (sql) => {
    const sqlResults = {
      multiResults: { rows: [{}, {}] },
      singleResult: { rows: [{}] },
    };
    return sqlResults[sql];
  },
  close: () => null,
});

describe('Test students-dao', () => {
  describe('Test getResourceById', () => {
    const fakeId = 'fakeId';
    const fakeStudentsSerializer = (rows, id, params) => rows; // eslint-disable-line no-unused-vars

    it(`should be fulfilled if
          1. isSingleton is true and only get exact one result
          2. isSingleton is false and get a list of results`, () => {
      const fakeParams = {};
      const fulfilledCases = [
        { fakeSql: () => 'singleResult', isSingleton: true, expectResult: {} },
        { fakeSql: () => 'singleResult', isSingleton: false, expectResult: [{}] },
        { fakeSql: () => 'multiResults', isSingleton: false, expectResult: [{}, {}] },
      ];

      const fulfilledPromises = [];
      _.each(fulfilledCases, ({ fakeSql, isSingleton, expectResult }) => {
        const result = studentsDao.getResourceById(
          fakeId,
          fakeSql,
          fakeStudentsSerializer,
          isSingleton,
          fakeParams,
        );
        fulfilledPromises.push(result.should
          .to.eventually.be.fulfilled
          .and.deep.equal(expectResult));
      });
      return Promise.all(fulfilledPromises);
    });

    it('should be rejected if isSingleton is true but get multiple results', () => {
      const fakeSql = () => 'multiResults';
      const isSingleton = true;
      const expectResult = 'Expect a single object but got multiple results.';
      const fakeParams = {};

      const result = studentsDao.getResourceById(
        fakeId,
        fakeSql,
        fakeStudentsSerializer,
        isSingleton,
        fakeParams,
      );
      return result.should.to.eventually.be.rejectedWith(expectResult).and.be.an.instanceOf(Error);
    });

    it('should call the serializer and pass the params', async () => {
      const fakeSql = () => 'multiResults';
      const isSingleton = false;
      const fakeParams = { key: 'value' };
      const spy = sinon.spy(fakeStudentsSerializer);

      await studentsDao.getResourceById(
        fakeId,
        fakeSql,
        spy,
        isSingleton,
        fakeParams,
      );
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWithExactly(spy.getCall(0), any, any, fakeParams);
    });
  });
});
