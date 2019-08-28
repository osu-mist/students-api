import { errorHandler } from 'errors/errors';

import { getAccountTransactionsById } from '../../../db/oracledb/students-dao';

/**
 * Get account transactions
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getAccountTransactionsById(osuId, req.query);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
