import * as React from 'react';
import { Button } from 'patternfly-react';
import { Alert, AlertActionCloseButton } from '@patternfly/react-core';
import { Table } from '@console/internal/components/factory';
import { PersistentVolumeClaimModel } from '@console/internal/models';
import { Firehose, FirehoseResult, Kebab } from '@console/internal/components/utils';
import { getNamespace, getName, createBasicLookup, createLookup } from '@console/shared';
import { useSafetyFirst } from '@console/internal/components/safety-first';
import { K8sResourceKind } from '@console/internal/module/k8s';
import { sortable } from '@patternfly/react-table';
import { DataVolumeModel } from '../../models';
import { VMLikeEntityKind } from '../../types';
import {
  asVM,
  getDataVolumeTemplates,
  getDisks,
  getVolumeDataVolumeName,
  getVolumePersistentVolumeClaimName,
  getVolumes,
} from '../../selectors/vm';
import { getPvcStorageClassName, getPvcStorageSize } from '../../selectors/pvc/selectors';
import {
  getDataVolumeStorageClassName,
  getDataVolumeStorageSize,
} from '../../selectors/dv/selectors';
import { VMLikeEntityTabProps } from '../vms/types';
import { getResource } from '../../utils';
import { getSimpleName } from '../../selectors/utils';
import { DiskRow } from './disk-row';
import { StorageBundle, StorageRowType, VMDiskRowProps } from './types';
import { CreateDiskRowFirehose } from './create-disk-row';

export const VMDiskRow: React.FC<VMDiskRowProps> = (props) => {
  switch (props.obj.storageType) {
    case StorageRowType.STORAGE_TYPE_VM:
      return <DiskRow {...props} key={StorageRowType.STORAGE_TYPE_VM} />;
    case StorageRowType.STORAGE_TYPE_CREATE:
      return <CreateDiskRowFirehose {...props} key={StorageRowType.STORAGE_TYPE_CREATE} />;
    default:
      return null;
  }
};

const getStoragesData = (
  {
    vmLikeEntity,
    datavolumes,
    pvcs,
  }: {
    vmLikeEntity: VMLikeEntityKind;
    pvcs: FirehoseResult<K8sResourceKind[]>;
    datavolumes: FirehoseResult<K8sResourceKind[]>;
  },
  addNewDisk: boolean,
  rerenderFlag: boolean,
): StorageBundle[] => {
  const vm = asVM(vmLikeEntity);

  const pvcLookup = createLookup(pvcs, getName);
  const datavolumeLookup = createLookup(datavolumes, getName);
  const volumeLookup = createBasicLookup(getVolumes(vm), getSimpleName);
  const datavolumeTemplatesLookup = createBasicLookup(getDataVolumeTemplates(vm), getName);

  const disksWithType = getDisks(vm).map((disk) => {
    const volume = volumeLookup[disk.name];

    const pvcName = getVolumePersistentVolumeClaimName(volume);
    const dataVolumeName = getVolumeDataVolumeName(volume);

    let size = null;
    let storageClass = null;

    if (pvcName) {
      const pvc = pvcLookup[pvcName];
      if (pvc) {
        size = getPvcStorageSize(pvc);
        storageClass = getPvcStorageClassName(pvc);
      } else if (!pvcs.loaded) {
        size = undefined;
        storageClass = undefined;
      }
    } else if (dataVolumeName) {
      const dataVolumeTemplate =
        datavolumeTemplatesLookup[dataVolumeName] || datavolumeLookup[dataVolumeName];

      if (dataVolumeTemplate) {
        size = getDataVolumeStorageSize(dataVolumeTemplate);
        storageClass = getDataVolumeStorageClassName(dataVolumeTemplate);
      } else if (!datavolumes.loaded) {
        size = undefined;
        storageClass = undefined;
      }
    }

    return {
      ...disk, // for sorting
      size,
      storageClass,
      storageType: StorageRowType.STORAGE_TYPE_VM,
      disk,
    };
  });

  return addNewDisk
    ? [{ storageType: StorageRowType.STORAGE_TYPE_CREATE, rerenderFlag }, ...disksWithType]
    : disksWithType;
};

export const VMDisks: React.FC<VMDisksProps> = ({ vmLikeEntity, pvcs, datavolumes }) => {
  const [isCreating, setIsCreating] = useSafetyFirst(false);
  const [createError, setCreateError] = useSafetyFirst(null);
  const [forceRerenderFlag, setForceRerenderFlag] = useSafetyFirst(false); // TODO: HACK: fire changes in Virtualize Table for CreateNicRow. Remove after deprecating CreateNicRow

  const vm = asVM(vmLikeEntity);

  return (
    <div className="co-m-list">
      <div className="co-m-pane__filter-bar">
        <div className="co-m-pane__filter-bar-group">
          <Button
            bsStyle="primary"
            id="create-disk-btn"
            onClick={() => setIsCreating(true)}
            disabled={isCreating}
          >
            Create Disk
          </Button>
        </div>
      </div>
      <div className="co-m-pane__body">
        {createError && (
          <Alert
            variant="danger"
            title={createError}
            className="kubevirt-vm-create-device-error"
            action={<AlertActionCloseButton onClose={() => setCreateError(null)} />}
          />
        )}
        <Table
          aria-label="VM Disks List"
          data={getStoragesData(
            {
              vmLikeEntity,
              pvcs,
              datavolumes,
            },
            isCreating,
            forceRerenderFlag,
          )}
          Header={() => [
            {
              title: 'Name',
              sortField: 'name',
              transforms: [sortable],
            },
            {
              title: 'Size',
              sortField: 'size',
              transforms: [sortable],
            },
            {
              title: 'Interface',
              sortField: 'disk.bus',
              transforms: [sortable],
            },
            {
              title: 'Storage Class',
              sortField: 'storageClass',
              transforms: [sortable],
            },
            {
              title: '',
              props: { className: Kebab.columnClass },
            },
          ]}
          Row={VMDiskRow}
          customData={{
            vmLikeEntity,
            vm,
            diskLookup: createBasicLookup(getDisks(vm), getSimpleName),
            onCreateRowDismiss: () => {
              setIsCreating(false);
            },
            onCreateRowError: (error) => {
              setIsCreating(false);
              setCreateError(error);
            },
            forceRerender: () => setForceRerenderFlag(!forceRerenderFlag),
          }}
          virtualize
          loaded
        />
      </div>
    </div>
  );
};

interface VMDisksProps {
  vmLikeEntity?: VMLikeEntityKind;
  pvcs?: FirehoseResult<K8sResourceKind[]>;
  datavolumes?: FirehoseResult<K8sResourceKind[]>;
}

export const VMDisksFirehose: React.FC<VMLikeEntityTabProps> = ({ obj: vmLikeEntity }) => {
  const namespace = getNamespace(vmLikeEntity);

  const resources = [
    getResource(PersistentVolumeClaimModel, {
      namespace,
      prop: 'pvcs',
    }),
    getResource(DataVolumeModel, {
      namespace,
      prop: 'datavolumes',
    }),
  ];

  return (
    <Firehose resources={resources}>
      <VMDisks vmLikeEntity={vmLikeEntity} />
    </Firehose>
  );
};
