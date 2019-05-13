import json
import logging
import unittest
import yaml

from prance import ResolvingParser

import utils


class integration_tests(unittest.TestCase):
    @classmethod
    def setup(cls, config_path, openapi_path):
        with open(config_path) as config_file:
            config = json.load(config_file)
            cls.base_url = utils.setup_base_url(config)
            cls.session = utils.setup_session(config)
            cls.test_cases = config['test_cases']
            cls.local_test = config['local_test']
            cls.not_found_id = '999999999'

        with open(openapi_path) as openapi_file:
            openapi = yaml.load(openapi_file, Loader=yaml.SafeLoader)
            if 'swagger' in openapi:
                backend = 'flex'
            elif 'openapi' in openapi:
                backend = 'openapi-spec-validator'
            else:
                exit('Error: could not determine openapi document version')

        parser = ResolvingParser(openapi_path, backend=backend)
        cls.openapi = parser.specification

    @classmethod
    def cleanup(cls):
        cls.session.close()

    # Test case: GET /students/{osuId}/account-balance
    def test_get_account_balance_by_id(self, endpoint='/students'):
        valid_ids = self.test_cases['valid_account_balance']

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/account-balance',
                                resource='AccountBalanceResource',
                                response_code=200)

        for osu_id in self.not_found_id:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}',
                                resource='Error',
                                response_code=404)

    # Test case: GET /students/{osuId}/account-transactions
    def test_get_account_transactions_by_id(self, endpoint='/students'):
        valid_ids = self.test_cases['valid_account_transactions']

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/account-transactions',
                                resource='AccountTransactionsResource',
                                response_code=200)

        for osu_id in self.not_found_id:
            utils.test_endpoint(self, f'{endpoint}/{osu_id}',
                                resource='Error',
                                response_code=404)

    # Test case: GET /students/{osuId}/academic-status
    def test_get_academic_status_by_id(self, endpoint='/students'):
        valid_ids = self.test_cases['valid_academic_status']

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/academic-status',
                                resource='AcademicStatusResource',
                                response_code=200)

        for osu_id in self.not_found_id:
            utils.test_endpoint(self, f'{endpoint}/{osu_id}',
                                resource='Error',
                                response_code=404)

    # Test case: GET /students/{osuId}/classification
    def test_get_classification_by_id(self, endpoint='/students'):
        valid_ids = self.test_cases['valid_classification']

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/classification',
                                resource='ClassificationResource',
                                response_code=200)

        for osu_id in self.not_found_id:
            utils.test_endpoint(self, f'{endpoint}/{osu_id}',
                                resource='Error',
                                response_code=404)

    # Test case: GET /students/{osuId}/gpa
    def test_get_gpa_by_id(self, endpoint='/students'):
        valid_ids = self.test_cases['valid_gpa']

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/gpa',
                                resource='GradePointAverageResource',
                                response_code=200)

        for osu_id in self.not_found_id:
            utils.test_endpoint(self, f'{endpoint}/{osu_id}',
                                resource='Error',
                                response_code=404)


if __name__ == '__main__':
    arguments, argv = utils.parse_arguments()

    # Setup logging level
    if arguments.debug:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    integration_tests.setup(arguments.config_path, arguments.openapi_path)
    unittest.main(argv=argv)
    integration_tests.cleanup()
