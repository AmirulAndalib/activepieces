import { typeboxResolver } from '@hookform/resolvers/typebox';
import deepEqual from 'deep-equal';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useBuilderStateContext } from '@/app/builder/builder-hooks';
import { Form } from '@/components/ui/form';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable-panel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { stepsHooks } from '@/features/pieces/lib/steps-hooks';
import { projectHooks } from '@/hooks/project-hooks';
import {
  Action,
  ActionType,
  FlowOperationType,
  Trigger,
  TriggerType,
  debounce,
  isNil,
} from '@activepieces/shared';

import { formUtils } from '../../../features/pieces/lib/form-utils';
import { ActionErrorHandlingForm } from '../piece-properties/action-error-handling';
import { DynamicPropertiesProvider } from '../piece-properties/dynamic-properties-context';
import { SidebarHeader } from '../sidebar-header';
import { TestStepContainer } from '../test-step';

import { CodeSettings } from './code-settings';
import EditableStepName from './editable-step-name';
import { LoopsSettings } from './loops-settings';
import { PieceSettings } from './piece-settings';
import { RouterSettings } from './router-settings';
import { StepCard } from './step-card';
import { useStepSettingsContext } from './step-settings-context';

const StepSettingsContainer = () => {
  const { selectedStep, pieceModel, formSchema } = useStepSettingsContext();
  const { project } = projectHooks.useCurrentProject();
  const [
    readonly,
    exitStepSettings,
    applyOperation,
    saving,
    flowVersion,
    selectedBranchIndex,
    setSelectedBranchIndex,
    refreshStepFormSettingsToggle,
  ] = useBuilderStateContext((state) => [
    state.readonly,
    state.exitStepSettings,
    state.applyOperation,
    state.saving,
    state.flowVersion,
    state.selectedBranchIndex,
    state.setSelectedBranchIndex,
    state.refreshStepFormSettingsToggle,
  ]);

  const defaultValues = useMemo(() => {
    return formUtils.buildPieceDefaultValue(selectedStep, pieceModel, true);
  }, [selectedStep.name, pieceModel]);

  useEffect(() => {
    currentValuesRef.current = defaultValues;
    form.reset(defaultValues);
    form.trigger();
    if (defaultValues.type === ActionType.LOOP_ON_ITEMS) {
      //TODO: fix this, for some reason if the form is not triggered, the items input error is not shown
      setTimeout(() => {
        form.trigger('settings.items');
      }, 1);
    }
  }, [defaultValues]);

  //Needed to show new code from Ask AI
  useEffect(() => {
    form.reset(selectedStep);
    form.trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshStepFormSettingsToggle]);

  const { stepMetadata } = stepsHooks.useStepMetadata({
    step: selectedStep,
  });

  const debouncedTrigger = useMemo(() => {
    return debounce((newTrigger: Trigger) => {
      applyOperation({
        type: FlowOperationType.UPDATE_TRIGGER,
        request: newTrigger,
      });
    }, 200);
  }, [applyOperation]);

  const debouncedAction = useMemo(() => {
    return debounce((newAction: Action) => {
      applyOperation({
        type: FlowOperationType.UPDATE_ACTION,
        request: newAction,
      });
    }, 200);
  }, [applyOperation]);
  const currentValuesRef = useRef<Action | Trigger>(defaultValues);
  const form = useForm<Action | Trigger>({
    mode: 'all',
    disabled: readonly,
    reValidateMode: 'onChange',
    defaultValues,
    resolver: async (values, context, options) => {
      const result = await typeboxResolver(formSchema)(
        values,
        context,
        options,
      );
      const cleanedNewValues = formUtils.removeUndefinedFromInput(values);
      const cleanedCurrentValues = formUtils.removeUndefinedFromInput(
        currentValuesRef.current,
      );
      if (
        cleanedNewValues.type === TriggerType.EMPTY ||
        (isNil(pieceModel) &&
          (cleanedNewValues.type === ActionType.PIECE ||
            cleanedNewValues.type === TriggerType.PIECE))
      ) {
        return result;
      }
      if (deepEqual(cleanedNewValues, cleanedCurrentValues)) {
        return result;
      }
      const valid = Object.keys(result.errors).length === 0;
      //We need to copy the object because the form is using the same object reference
      currentValuesRef.current = JSON.parse(JSON.stringify(cleanedNewValues));
      if (cleanedNewValues.type === TriggerType.PIECE) {
        debouncedTrigger({ ...cleanedNewValues, valid });
      } else {
        debouncedAction({ ...cleanedNewValues, valid });
      }

      return result;
    },
  });

  const sidebarHeaderContainerRef = useRef<HTMLDivElement>(null);
  const modifiedStep = form.getValues();
  const [isEditingStepOrBranchName, setIsEditingStepOrBranchName] =
    useState(false);
  const showActionErrorHandlingForm =
    [ActionType.CODE, ActionType.PIECE].includes(
      modifiedStep.type as ActionType,
    ) && !isNil(stepMetadata);
  return (
    <Form {...form}>
      <form
        onSubmit={(e) => e.preventDefault()}
        onChange={(e) => e.preventDefault()}
        className="w-full h-full"
      >
        <div ref={sidebarHeaderContainerRef}>
          <SidebarHeader onClose={() => exitStepSettings()}>
            <EditableStepName
              selectedBranchIndex={selectedBranchIndex}
              setDisplayName={(value) => {
                form.setValue('displayName', value, {
                  shouldValidate: true,
                });
              }}
              readonly={readonly}
              displayName={modifiedStep.displayName}
              branchName={
                !isNil(selectedBranchIndex)
                  ? modifiedStep.settings.branches?.[selectedBranchIndex]
                      ?.branchName
                  : undefined
              }
              setBranchName={(value) => {
                if (!isNil(selectedBranchIndex)) {
                  form.setValue(
                    `settings.branches[${selectedBranchIndex}].branchName`,
                    value,
                    {
                      shouldValidate: true,
                    },
                  );
                }
              }}
              setSelectedBranchIndex={setSelectedBranchIndex}
              isEditingStepOrBranchName={isEditingStepOrBranchName}
              setIsEditingStepOrBranchName={setIsEditingStepOrBranchName}
            ></EditableStepName>
          </SidebarHeader>
        </div>
        <DynamicPropertiesProvider
          key={`${selectedStep.name}-${selectedStep.type}`}
        >
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={55}>
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 px-4 pb-6">
                  <StepCard step={modifiedStep}></StepCard>

                  {modifiedStep.type === ActionType.LOOP_ON_ITEMS && (
                    <LoopsSettings readonly={readonly}></LoopsSettings>
                  )}
                  {modifiedStep.type === ActionType.CODE && (
                    <CodeSettings readonly={readonly}></CodeSettings>
                  )}
                  {modifiedStep.type === ActionType.PIECE && modifiedStep && (
                    <PieceSettings
                      step={modifiedStep}
                      flowId={flowVersion.flowId}
                      readonly={readonly}
                    ></PieceSettings>
                  )}
                  {modifiedStep.type === ActionType.ROUTER && modifiedStep && (
                    <RouterSettings readonly={readonly}></RouterSettings>
                  )}
                  {modifiedStep.type === TriggerType.PIECE && modifiedStep && (
                    <PieceSettings
                      step={modifiedStep}
                      flowId={flowVersion.flowId}
                      readonly={readonly}
                    ></PieceSettings>
                  )}
                  {showActionErrorHandlingForm && (
                    <ActionErrorHandlingForm
                      hideContinueOnFailure={
                        stepMetadata.type === ActionType.PIECE
                          ? stepMetadata.errorHandlingOptions?.continueOnFailure
                              ?.hide
                          : false
                      }
                      disabled={readonly}
                      hideRetryOnFailure={
                        stepMetadata.type === ActionType.PIECE
                          ? stepMetadata.errorHandlingOptions?.retryOnFailure
                              ?.hide
                          : false
                      }
                    ></ActionErrorHandlingForm>
                  )}
                </div>
              </ScrollArea>
            </ResizablePanel>
            {!readonly && (
              <>
                <ResizableHandle withHandle={true} />
                <ResizablePanel defaultSize={45}>
                  <ScrollArea className="h-[calc(100%-35px)] p-4 pb-10 ">
                    {modifiedStep.type && (
                      <TestStepContainer
                        type={modifiedStep.type}
                        flowId={flowVersion.flowId}
                        flowVersionId={flowVersion.id}
                        projectId={project?.id}
                        isSaving={saving}
                      ></TestStepContainer>
                    )}
                  </ScrollArea>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </DynamicPropertiesProvider>
      </form>
    </Form>
  );
};
StepSettingsContainer.displayName = 'StepSettingsContainer';
export { StepSettingsContainer };
