import { useCallback, useState } from 'react';
import {
  Button,
  Form,
  FormField,
  Input,
  Modal,
} from '../../../components/ui';
import {
  getResourceActionAvailability,
  submitResourceAction,
} from '../services/resourceRepository';
import type {
  Resource,
  ResourceAction,
  ResourceActionResult,
  ResourceRepositoryOptions,
} from '../types';

const ACTIONS: readonly ResourceAction[] = [
  'start',
  'stop',
  'restart',
  'rename',
  'release',
];

const ACTION_LABELS: Readonly<Record<ResourceAction, string>> = {
  start: '启动',
  stop: '停止',
  restart: '重启',
  rename: '修改名称',
  release: '释放资源',
};

type SubmitAction = (
  request: Parameters<typeof submitResourceAction>[0],
  options?: ResourceRepositoryOptions,
) => Promise<ResourceActionResult>;

type ResourceActionDialogProps = Readonly<{
  resource: Resource | undefined;
  open: boolean;
  onClose: () => void;
  onCompleted: (result: ResourceActionResult) => void;
  submitAction?: SubmitAction;
}>;

function validateName(value: string, currentName: string) {
  const nextName = value.trim();
  if (!nextName) return '请输入资源名称。';
  if (nextName.length > 48) return '资源名称不能超过 48 个字符。';
  if (nextName === currentName) return '请输入与当前名称不同的资源名称。';
  return '';
}

export function ResourceActionDialog({
  resource,
  open,
  onClose,
  onCompleted,
  submitAction = submitResourceAction,
}: ResourceActionDialogProps) {
  const [selectedAction, setSelectedAction] = useState<ResourceAction>();
  const [nextName, setNextName] = useState(resource?.name ?? '');
  const [nameError, setNameError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  if (!open || !resource) return null;
  const currentResource = resource;

  function chooseAction(action: ResourceAction) {
    const availability = getResourceActionAvailability(currentResource, action);
    if (!availability.enabled) return;
    setSubmitError('');
    setNameError('');
    setSelectedAction(action);
  }

  async function submit() {
    if (!selectedAction || busy) return;
    if (selectedAction === 'rename') {
      const validationError = validateName(nextName, currentResource.name);
      setNameError(validationError);
      if (validationError) return;
    }

    setBusy(true);
    setSubmitError('');
    try {
      const result = await submitAction({
        resourceType: currentResource.resourceType,
        resourceId: currentResource.id,
        action: selectedAction,
        nextName: selectedAction === 'rename' ? nextName.trim() : undefined,
      });
      onCompleted(result);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : '操作请求提交失败，请稍后重试。',
      );
      setBusy(false);
    }
  }

  const modalTitle = selectedAction
    ? `${ACTION_LABELS[selectedAction]}资源`
    : '管理资源';

  return (
    <Modal
      open={open}
      title={modalTitle}
      onClose={close}
      busy={busy}
      role={selectedAction === 'release' ? 'alertdialog' : 'dialog'}
      primaryAction={
        selectedAction
          ? {
              label:
                selectedAction === 'rename'
                  ? '保存名称'
                  : `确认${ACTION_LABELS[selectedAction]}`,
              variant:
                selectedAction === 'stop' ||
                selectedAction === 'restart' ||
                selectedAction === 'release'
                  ? 'danger'
                  : 'primary',
              onClick: submit,
            }
          : { label: '关闭', onClick: close, variant: 'secondary' }
      }
      secondaryAction={
        selectedAction
          ? {
              label: '返回',
              onClick: () => {
                setSelectedAction(undefined);
                setSubmitError('');
                setNameError('');
              },
            }
          : undefined
      }
    >
      {selectedAction ? (
        <Form
          className="resource-action-dialog__form"
          onSubmit={() => void submit()}
        >
          {selectedAction === 'rename' ? (
            <FormField
              label="资源名称"
              required
              help="最多 48 个字符。"
              error={nameError || undefined}
            >
              <Input
                value={nextName}
                maxLength={48}
                showCount
                disabled={busy}
                onChange={(event) => {
                  setNextName(event.target.value);
                  if (nameError) setNameError('');
                }}
              />
            </FormField>
          ) : (
            <div className="resource-action-dialog__confirmation">
              <strong>
                确认对“{currentResource.name}”执行
                {ACTION_LABELS[selectedAction]}操作？
              </strong>
              <p>提交后资源状态将更新，处理结果可在操作记录中查看。</p>
            </div>
          )}
          {submitError && (
            <p className="resource-action-dialog__error" role="alert">
              {submitError}
            </p>
          )}
        </Form>
      ) : (
        <div className="resource-action-dialog__choices">
          <p>选择要对“{currentResource.name}”执行的操作。</p>
          {ACTIONS.map((action) => {
            const availability = getResourceActionAvailability(
              currentResource,
              action,
            );
            return (
              <div key={action} className="resource-action-dialog__choice">
                <Button
                  variant={action === 'release' ? 'danger' : 'secondary'}
                  disabled={!availability.enabled}
                  onClick={() => chooseAction(action)}
                >
                  {ACTION_LABELS[action]}
                </Button>
                {!availability.enabled && availability.reason && (
                  <span>{availability.reason}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
