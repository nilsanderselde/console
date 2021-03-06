import { testName } from '@console/internal-integration-tests/protractor.conf';
import { SpecCapability, StatusCapability } from '../src/components/descriptors/types';

const defaultValueFor = <C extends SpecCapability | StatusCapability>(capability: C) => {
  switch (capability) {
    case SpecCapability.podCount:
      return 3;
    case SpecCapability.endpointList:
      return [{ port: 8080, scheme: 'TCP' }];
    case SpecCapability.label:
      return 'app=openshift';
    case SpecCapability.resourceRequirements:
      return {
        limits: { cpu: '500m', memory: '50Mi', 'ephemeral-storage': '500Gi' },
        requests: { cpu: '500m', memory: '50Mi', 'ephemeral-storage': '500Gi' },
      };
    case SpecCapability.namespaceSelector:
      return { matchNames: ['default'] };
    case SpecCapability.booleanSwitch:
      return true;
    case SpecCapability.password:
      return 'password123';
    case SpecCapability.checkbox:
      return true;
    case SpecCapability.imagePullPolicy:
      return 'Never';
    case SpecCapability.updateStrategy:
      return { type: 'Recreate' };
    case SpecCapability.text:
      return 'Some text';
    case SpecCapability.number:
      return 2;
    case SpecCapability.select:
      return '';

    case StatusCapability.podStatuses:
      return { ready: ['pod-0', 'pod-1'], unhealthy: ['pod-2'], stopped: ['pod-3'] };
    case StatusCapability.podCount:
      return 3;
    case StatusCapability.w3Link:
      return 'https://google.com';
    case StatusCapability.conditions:
      return [
        {
          type: 'Available',
          status: 'True',
          lastUpdateTime: '2018-08-22T23:27:55Z',
          lastTransitionTime: '2018-08-22T23:27:55Z',
          reason: 'AppReady',
          message: 'App is ready.',
        },
      ];
    case StatusCapability.text:
      return 'Some text';
    case StatusCapability.prometheusEndpoint:
      return 'my-svc.my-namespace.svc.cluster.local';
    case StatusCapability.k8sPhase:
      return 'Available';
    case StatusCapability.k8sPhaseReason:
      return 'AppReady';

    default:
      return null;
  }
};

const testLabel = 'automatedTestName';
const prefixedCapabilities = new Set([
  SpecCapability.selector,
  SpecCapability.k8sResourcePrefix,
  SpecCapability.fieldGroup,
  SpecCapability.arrayFieldGroup,
  SpecCapability.select,
  StatusCapability.k8sResourcePrefix,
]);

const specDescriptorFieldGroup = [
  {
    description: 'Field #1 for specDescriptorFieldGroup',
    displayName: 'Field Group Field1',
    path: 'specDescriptorFieldGroup.fieldOne',
    'x-descriptors': [
      SpecCapability.fieldGroup.concat('specDescriptorFieldGroup'),
      SpecCapability.number,
    ],
  },
  {
    description: 'Field #2 for specDescriptorFieldGroup',
    displayName: 'Field Group Field2',
    path: 'specDescriptorFieldGroup.fieldTwo',
    'x-descriptors': [
      SpecCapability.fieldGroup.concat('specDescriptorFieldGroup'),
      SpecCapability.number,
    ],
  },
];

const specDescriptorArrayFieldGroup = [
  {
    description: 'Field #1 for specDescriptorArrayFieldGroup',
    displayName: 'Array Field Group Field1',
    path: 'specDescriptorArrayFieldGroup[0].fieldOne',
    'x-descriptors': [
      SpecCapability.arrayFieldGroup.concat('specDescriptorArrayFieldGroup'),
      SpecCapability.number,
    ],
  },
  {
    description: 'Field #2 for specDescriptorArrayFieldGroup',
    displayName: 'Array Field Group Field2',
    path: 'specDescriptorArrayFieldGroup[0].fieldTwo',
    'x-descriptors': [
      SpecCapability.arrayFieldGroup.concat('specDescriptorArrayFieldGroup'),
      SpecCapability.text,
    ],
  },
];

export const testCRD = {
  apiVersion: 'apiextensions.k8s.io/v1beta1',
  kind: 'CustomResourceDefinition',
  metadata: {
    name: 'apps.test.tectonic.com',
    labels: { [testLabel]: testName },
  },
  spec: {
    group: 'test.tectonic.com',
    version: 'v1',
    scope: 'Namespaced',
    names: {
      plural: 'apps',
      singular: 'app',
      kind: 'App',
      listKind: 'Apps',
    },
    validation: {
      openAPIV3Schema: {
        properties: {
          spec: {
            type: 'object',
            required: ['password', 'select'],
            properties: {
              password: {
                type: 'string',
                minLength: 1,
                maxLength: 25,
                pattern: '^[a-zA-Z0-9._\\-%]*$',
              },
              number: {
                type: 'integer',
                minimum: 2,
                maximum: 4,
              },
              select: {
                type: 'string',
                enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'],
              },
              fieldGroup: {
                type: 'object',
                properties: {
                  itemOne: {
                    type: 'string',
                  },
                  itemTwo: {
                    type: 'integer',
                  },
                },
              },
              arrayFieldGroup: {
                type: 'array',
                items: {
                  properties: {
                    itemOne: {
                      type: 'string',
                    },
                    itemTwo: {
                      type: 'integer',
                    },
                  },
                },
              },
              hiddenFieldGroup: {
                type: 'object',
                properties: {
                  hiddenItem: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const testCR = {
  apiVersion: `${testCRD.spec.group}/${testCRD.spec.version}`,
  kind: testCRD.spec.names.kind,
  metadata: {
    name: 'olm-descriptors-test',
    namespace: testName,
    labels: { [testLabel]: testName },
  },
  spec: {
    ...Object.keys(SpecCapability)
      .filter((c) => !prefixedCapabilities.has(SpecCapability[c]))
      .reduce(
        (acc, cur) => ({
          ...acc,
          [cur]: defaultValueFor(SpecCapability[cur]),
        }),
        { select: 'WARN' },
      ),
  },
  status: {
    ...Object.keys(StatusCapability)
      .filter((c) => !prefixedCapabilities.has(StatusCapability[c]))
      .reduce(
        (acc, cur) => ({
          ...acc,
          [cur]: defaultValueFor(StatusCapability[cur]),
        }),
        {},
      ),
  },
};

export const testCSV = {
  apiVersion: 'operators.coreos.com/v1alpha1',
  kind: 'ClusterServiceVersion',
  metadata: {
    name: 'olm-descriptors-test',
    namespace: testName,
    labels: { [testLabel]: testName },
    annotations: { 'alm-examples': JSON.stringify([testCR]) },
  },
  spec: {
    displayName: 'Test Operator',
    install: {
      strategy: 'deployment',
      spec: {
        permissions: [],
        deployments: [
          {
            name: 'test-operator',
            spec: {
              replicas: 1,
              selector: {
                matchLabels: {
                  name: 'test-operator-alm-owned',
                },
              },
              template: {
                metadata: {
                  name: 'test-operator-alm-owned',
                  labels: {
                    name: 'test-operator-alm-owned',
                  },
                },
                spec: {
                  serviceAccountName: 'test-operator',
                  containers: [
                    {
                      name: 'test-operator',
                      image: 'nginx',
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
    customresourcedefinitions: {
      owned: [
        {
          name: testCRD.metadata.name,
          version: testCRD.spec.version,
          kind: testCRD.spec.names.kind,
          displayName: testCRD.spec.names.kind,
          description: 'Application instance for testing descriptors',
          resources: [],
          specDescriptors: Object.keys(SpecCapability)
            .filter((c) => !prefixedCapabilities.has(SpecCapability[c]))
            .map((capability) => ({
              description: `Spec descriptor for ${capability}`,
              displayName: capability
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase()),
              path: capability,
              'x-descriptors': [SpecCapability[capability]],
            }))
            .concat(specDescriptorFieldGroup)
            .concat(specDescriptorArrayFieldGroup),
          statusDescriptors: Object.keys(StatusCapability)
            .filter((c) => !prefixedCapabilities.has(StatusCapability[c]))
            .map((capability) => ({
              description: `Status descriptor for ${capability}`,
              displayName: capability
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase()),
              path: capability,
              'x-descriptors': [StatusCapability[capability]],
            })),
        },
      ],
    },
  },
};
