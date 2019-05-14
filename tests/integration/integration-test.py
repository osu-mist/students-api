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
            cls.local_test = config['local_test']

            cls.test_cases = config['test_cases']
            cls.valid_terms = cls.test_cases['valid_terms']
            cls.invalid_terms = cls.test_cases['invalid_terms']

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

    @classmethod
    # Helper function to get testing endpoint
    def get_test_endpoint(cls, test_case, endpoint, sub_endpoint):
        return f'{endpoint}/{cls.test_cases[test_case]}/{sub_endpoint}'

    # Helper function for testing term query
    def term_testing(self, endpoint, resource, nullable_fields=None):
        for valid_term in self.valid_terms:
                    params = {'term': valid_term}
                    utils.test_endpoint(self, endpoint,
                                        resource=resource, response_code=200,
                                        nullable_fields=nullable_fields,
                                        query_params=params)

        for valid_term in self.invalid_terms:
            params = {'term': valid_term}
            utils.test_endpoint(self, endpoint,
                                resource='Error', response_code=400,
                                query_params=params)

    # Test case: GET /students/{osuId}/account-balance
    def test_get_account_balance_by_id(self, endpoint='/students'):
        resource = 'AccountBalanceResource'
        endpoint = self.get_test_endpoint('valid_account_balance',
                                          endpoint,
                                          'account-balance')

        utils.test_endpoint(self, endpoint,
                            resource=resource, response_code=200)

    # Test case: GET /students/{osuId}/account-transactions
    def test_get_account_transactions_by_id(self, endpoint='/students'):
        resource = 'AccountTransactionsResource'
        endpoint = self.get_test_endpoint('valid_account_transactions',
                                          endpoint,
                                          'account-transactions')

        utils.test_endpoint(self, endpoint,
                            resource=resource, response_code=200)

    # Test case: GET /students/{osuId}/academic-status
    def test_get_academic_status_by_id(self, endpoint='/students'):
        resource = 'AcademicStatusResource'
        endpoint = self.get_test_endpoint('valid_academic_status',
                                          endpoint,
                                          'academic-status')

        utils.test_endpoint(self, endpoint,
                            resource=resource, response_code=200)

        self.term_testing(endpoint, resource)

    # Test case: GET /students/{osuId}/classification
    def test_get_classification_by_id(self, endpoint='/students'):
        resource = 'ClassificationResource'
        endpoint = self.get_test_endpoint('valid_classification',
                                          endpoint,
                                          'classification')

        utils.test_endpoint(self, endpoint,
                            resource=resource, response_code=200)

    # Test case: GET /students/{osuId}/gpa
    def test_get_gpa_by_id(self, endpoint='/students'):
        resource = 'GradePointAverageResource'
        endpoint = self.get_test_endpoint('valid_gpa',
                                          endpoint,
                                          'gpa')

        utils.test_endpoint(self, endpoint,
                            resource=resource, response_code=200)

    # Test case: GET /students/{osuId}/grades
    def test_get_grades_by_id(self, endpoint='/students'):
        resource = 'GradesResource'
        endpoint = self.get_test_endpoint('valid_grades',
                                          endpoint,
                                          'grades')

        utils.test_endpoint(self, endpoint,
                            resource=resource, response_code=200)

        self.term_testing(endpoint, resource)

    # Test case: GET /students/{osuId}/class-schedule
    def test_get_class_schedule_by_id(self, endpoint='/students'):
        resource = 'ClassScheduleResource'
        endpoint = self.get_test_endpoint('valid_class_schedule',
                                          endpoint,
                                          'class-schedule')

        """
        Since OpenAPI 2.0 doesn't support nullable attribute, we need to
        manually exclude nullable fields until we migrate to OpenAPI 3.0
        """
        nullable_fields = [
            'email',
            'beginTime',
            'endTime',
            'room',
            'building',
            'buildingDescription'
        ]

        utils.test_endpoint(self, endpoint,
                            resource=resource, response_code=200,
                            nullable_fields=nullable_fields)

        self.term_testing(endpoint, resource, nullable_fields=nullable_fields)

    # Test case: GET /students/{osuId}/holds
    def test_get_holds_by_id(self, endpoint='/students'):
        resource = 'HoldsResource'
        endpoint = self.get_test_endpoint('valid_holds',
                                          endpoint,
                                          'holds')

        utils.test_endpoint(self, endpoint,
                            resource=resource, response_code=200)

    # Test case: GET /students/{osuId}/dual-enrollment
    def test_get_dual_enrollment_by_id(self, endpoint='/students'):
        resource = 'DualEnrollmentResource'
        endpoint = self.get_test_endpoint('valid_dual_enrollment',
                                          endpoint,
                                          'dual-enrollment')

        utils.test_endpoint(self, endpoint,
                            resource=resource, response_code=200)

        self.term_testing(endpoint, resource)


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
