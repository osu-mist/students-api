import { errorHandler } from 'errors/errors';

import { getEmergencyContactsById } from '../../../db/oracledb/students-dao';

/**
 * Get emergency contacts
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getEmergencyContactsById(osuId);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
