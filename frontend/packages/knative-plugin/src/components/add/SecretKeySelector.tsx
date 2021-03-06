import * as React from 'react';
import { useFormikContext, FormikValues, useField } from 'formik';
import { connect } from 'react-redux';
import { k8sGet } from '@console/internal/module/k8s';
import { SecretModel } from '@console/internal/models';
import { errorModal } from '@console/internal/components/modals/error-modal';
import { FormGroup } from '@patternfly/react-core';
import { ValueFromPair } from '@console/internal/components/utils/value-from-pair';
import { getFieldId } from '@console/shared';
import { getActiveNamespace } from '@console/internal/reducers/ui';
import { RootState } from '@console/internal/redux';

interface SecretKeySelectorProps {
  name: string;
  label: string;
}

interface StateProps {
  namespace: string;
}

const SecretKeySelector: React.FC<SecretKeySelectorProps & StateProps> = ({
  name,
  label,
  namespace,
}) => {
  const { setFieldValue, setFieldTouched } = useFormikContext<FormikValues>();
  const [field, { touched, error }] = useField(name);
  const [secrets, setSecrets] = React.useState({});
  const fieldId = getFieldId(name, 'secret-key-input');
  const isValid = !(touched && error);
  const errorMessage = !isValid ? error : '';

  React.useEffect(() => {
    k8sGet(SecretModel, null, namespace)
      .then((nsSecrets) => {
        setSecrets(nsSecrets);
      })
      .catch((err) => {
        if (err?.response?.status !== 403) {
          errorModal({ error: err?.message });
        }
      });
  }, [namespace]);

  return (
    <FormGroup fieldId={fieldId} label={label} helperTextInvalid={errorMessage} isValid={isValid}>
      <ValueFromPair
        pair={{ secretKeyRef: field.value }}
        secrets={secrets}
        configMaps={{}}
        onChange={(val) => {
          setFieldValue(name, val.target.value.secretKeyRef);
          setFieldTouched(name, true);
        }}
      />
    </FormGroup>
  );
};

const mapStateToProps = (state: RootState): StateProps => ({
  namespace: getActiveNamespace(state),
});

export default connect<StateProps, null, SecretKeySelectorProps>(mapStateToProps)(
  SecretKeySelector,
);
