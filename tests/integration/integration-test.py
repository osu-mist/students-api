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
        sub_endpoint = 'account-balance'

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/{sub_endpoint}',
                                resource='AccountBalanceResource',
                                response_code=200)

    # Test case: GET /students/{osuId}/account-transactions
    def test_get_account_transactions_by_id(self, endpoint='/students'):
        valid_ids = self.test_cases['valid_account_transactions']
        sub_endpoint = 'account-transactions'

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/{sub_endpoint}',
                                resource='AccountTransactionsResource',
                                response_code=200)

    # Test case: GET /students/{osuId}/academic-status
    def test_get_academic_status_by_id(self, endpoint='/students'):
        valid_ids = self.test_cases['valid_academic_status']
        sub_endpoint = 'academic-status'

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/{sub_endpoint}',
                                resource='AcademicStatusResource',
                                response_code=200)

    # Test case: GET /students/{osuId}/classification
    def test_get_classification_by_id(self, endpoint='/students'):
        valid_ids = self.test_cases['valid_classification']
        sub_endpoint = 'classification'

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/{sub_endpoint}',
                                resource='ClassificationResource',
                                response_code=200)

    # Test case: GET /students/{osuId}/gpa
    def test_get_gpa_by_id(self, endpoint='/students'):
        valid_ids = self.test_cases['valid_gpa']
        sub_endpoint = 'gpa'

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/{sub_endpoint}',
                                resource='GradePointAverageResource',
                                response_code=200)

    # Test case: GET /students/{osuId}/class-schedule
    def test_get_class_schedule_by_id(self, endpoint='/students'):
        nullable_fields = [
            'email',
            'beginTime',
            'endTime',
            'room',
            'building',
            'buildingDescription'
        ]
        valid_ids = self.test_cases['valid_class_schedule']
        sub_endpoint = 'class-schedule'

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/{sub_endpoint}',
                                resource='ClassScheduleResource',
                                response_code=200,
                                nullable_fields=nullable_fields)

    # Test case: GET /students/{osuId}/holds
    def test_get_holds_by_id(self, endpoint='/students'):
        valid_ids = self.test_cases['valid_holds']
        sub_endpoint = 'holds'

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/{sub_endpoint}',
                                resource='HoldsResource',
                                response_code=200)

    # Test case: GET /students/{osuId}/dual-enrollment
    def test_get_dual_enrollment_by_id(self, endpoint='/students'):
        valid_ids = self.test_cases['valid_dual_enrollment']
        sub_endpoint = 'dual-enrollment'

        for osu_id in valid_ids:
            utils.test_endpoint(self,
                                f'{endpoint}/{osu_id}/{sub_endpoint}',
                                resource='DualEnrollmentResource',
                                response_code=200)


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
