import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import config from 'config';
import _ from 'lodash';
import proxyquire from 'proxyquire';
import sinon from 'sinon';

chai.should();
chai.use(chaiAsPromised);
const { any } = sinon.match;

describe('Test students-dao', () => {
  const fakeId = 'fakeId';
  const fakeParams = {};
  const fakeExtraBinds = {};
  const stubStudentsSerializer = sinon.stub().returnsArg(0);

  sinon.replace(config, 'get', () => ({ oracledb: {} }));
  const studentsDao = proxyquire('../../api/v1/db/oracledb/students-dao', {
    './connection': {
      getConnection: sinon.stub().resolves({
        execute: (sql) => {
          const sqlResults = {
            multiResults: { rows: [{}, {}] },
            singleResult: { rows: [{}] },
          };
          return sql in sqlResults ? sqlResults[sql] : sqlResults.singleResult;
        },
        close: () => null,
      }),
    },
  });

  afterEach(() => stubStudentsSerializer.resetHistory());

  it(`should be fulfilled if
        1. isSingleton is true and only get exact one result
        2. isSingleton is false and get a list of results`, () => {
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
        stubStudentsSerializer,
        isSingleton,
        fakeExtraBinds,
        fakeParams,
      );
      fulfilledPromises.push(result.should
        .eventually.be.fulfilled
        .and.deep.equal(expectResult)
        .then(() => {
          sinon.assert.alwaysCalledWithExactly(stubStudentsSerializer, any, any, fakeParams);
          sinon.assert.callCount(stubStudentsSerializer, fulfilledCases.length);
        }));
    });
    return Promise.all(fulfilledPromises);
  });
  it('should be rejected if isSingleton is true but get multiple results', () => {
    const fakeSql = () => 'multiResults';
    const isSingleton = true;
    const expectResult = 'Expect a single object but got multiple results.';

    const result = studentsDao.getResourceById(
      fakeId,
      fakeSql,
      stubStudentsSerializer,
      isSingleton,
      fakeExtraBinds,
      fakeParams,
    );
    return result.should
      .eventually.be.rejectedWith(expectResult)
      .and.be.an.instanceOf(Error)
      .then(() => sinon.assert.notCalled(stubStudentsSerializer));
  });
});
