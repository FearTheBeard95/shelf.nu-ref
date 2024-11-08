import type { Cattle } from "@prisma/client";
import { useActionData, useNavigation } from "@remix-run/react";
import { useAtom } from "jotai";
import { useZorm } from "react-zorm";
import { z } from "zod";
import { updateDynamicTitleAtom } from "~/atoms/dynamic-title-atom";
import { isFormProcessing } from "~/utils/form";

import { zodFieldIsRequired } from "~/utils/zod";
import { Form } from "../custom-form";
import DynamicSelect from "../dynamic-select/dynamic-select";
import FormRow from "../forms/form-row";
import { InnerLabel } from "../forms/inner-label";
import Input from "../forms/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../forms/select";
import { AbsolutePositionedHeaderActions } from "../layout/header/absolute-positioned-header-actions";
import { Button } from "../shared/button";
import { ButtonGroup } from "../shared/button-group";
import { Card } from "../shared/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../shared/tooltip";

const BREEDS = [
  "ANGUS",
  "HEREFORD",
  "HOLSTEIN",
  "JERSEY",
  "CHAROLAIS",
  "SIMMENTAL",
  "BRAHMAN",
  "LIMOUSIN",
  "GELBVIEH",
  "SHORTHORN",
  "BRANGUS",
  "BELTED_GALLOWAY",
  "LONGHORN",
  "GUERNSEY",
  "AYRSHIRE",
];
const HEALTH_STATUS = ["Healthy", "Sick", "Injured", "Dead"];

export const NewCattleFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name is required")
    .transform((val) => val.trim()), // We trim to avoid white spaces at start and end

  tagNumber: z.string().transform((val) => val.trim()),
  breed: z.enum([
    "ANGUS",
    "HEREFORD",
    "HOLSTEIN",
    "JERSEY",
    "CHAROLAIS",
    "SIMMENTAL",
    "BRAHMAN",
    "LIMOUSIN",
    "GELBVIEH",
    "SHORTHORN",
    "BRANGUS",
    "BELTED_GALLOWAY",
    "LONGHORN",
    "GUERNSEY",
    "AYRSHIRE",
  ]),
  gender: z.enum(["Male", "Female"]),
  /** This holds the value of the current location. We need it for comparison reasons on the server.
   * We send it as part of the form data and compare it with the current location of the asset and prevent querying the database if it's the same.
   */
  isOx: z.boolean().optional().default(false),
  dateOfBirth: z.string().optional(),
  healthStatus: z.enum(["Healthy", "Sick", "Injured", "Dead"]),
  vaccinationRecords: z.string().optional(),
  sireId: z.string().optional(),
  damId: z.string().optional(),
  kraalId: z.string().optional(),
  addAnother: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

/** Pass props of the values to be used as default for the form fields */
interface Props {
  id?: Cattle["id"];
  name?: Cattle["name"];
  tagNumber?: Cattle["tagNumber"];
  breed?: Cattle["breed"];
  gender?: Cattle["gender"];
  isOx?: Cattle["isOx"];
  dateOfBirth?: Cattle["dateOfBirth"];
  healthStatus?: Cattle["healthStatus"];
  vaccinationRecords?: Cattle["vaccinationRecords"];
  sireId?: Cattle["sireId"];
  damId?: Cattle["damId"];
  kraalId?: Cattle["id"];
}

export const CattleForm = ({
  name,
  tagNumber,
  breed,
  gender,
  dateOfBirth,
  healthStatus,
  vaccinationRecords,
  sireId,
  damId,
  kraalId,
}: Props) => {
  const navigation = useNavigation();
  const FormSchema = NewCattleFormSchema;

  const zo = useZorm("NewQuestionWizardScreen", FormSchema);
  const disabled = isFormProcessing(navigation.state);

  const [, updateDynamicTitle] = useAtom(updateDynamicTitleAtom);

  const actionData = useActionData<{
    errors?: {
      title?: {
        message: string;
      };
    };
  }>();

  return (
    <Card className="w-full lg:w-min">
      <Form
        ref={zo.ref}
        method="post"
        className="flex w-full flex-col gap-2"
        encType="multipart/form-data"
      >
        <AbsolutePositionedHeaderActions className="hidden md:flex">
          <Actions disabled={disabled} />
        </AbsolutePositionedHeaderActions>

        <div className="flex items-start justify-between border-b pb-5">
          <div className=" ">
            <h2 className="mb-1 text-[18px] font-semibold">Basic fields</h2>
            <p>Basic information about your asset.</p>
          </div>
          <div className="hidden flex-1 justify-end gap-2 md:flex">
            <Actions disabled={disabled} />
          </div>
        </div>

        <FormRow rowLabel={"Name"} className="border-b-0 pb-[10px]" required>
          <Input
            label="Name"
            hideLabel
            name={zo.fields.name()}
            disabled={disabled}
            error={
              actionData?.errors?.title?.message || zo.errors.name()?.message
            }
            autoFocus
            onChange={updateDynamicTitle}
            className="w-full"
            defaultValue={name || ""}
            required
          />
        </FormRow>

        <FormRow
          rowLabel={"Gender"}
          className={"border-b-0"}
          subHeading={
            <p>
              Choose the gender of the cattle. This will help you to identify it
              later.
            </p>
          }
          required={true}
        >
          <InnerLabel hideLg>Gender</InnerLabel>
          <Select
            defaultValue={gender || "Male"}
            disabled={disabled}
            name={zo.fields.gender()}
          >
            <SelectTrigger className="px-3.5 py-3">
              <SelectValue placeholder="Choose a field type" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="w-full min-w-[300px]"
              align="start"
            >
              <div className=" max-h-[320px] overflow-auto">
                {["Male", "Female"].map((value) => (
                  <SelectItem value={value} key={value}>
                    <span className="mr-4 text-[14px] text-gray-700">
                      {value}
                    </span>
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        </FormRow>

        {/* Breed */}
        <FormRow
          rowLabel={"Breed"}
          className={"border-b-0"}
          subHeading={<p>Choose the breed of the cattle.</p>}
          required={true}
        >
          <InnerLabel hideLg>Breed</InnerLabel>
          <Select
            defaultValue={breed || "BRAHMAN"}
            disabled={disabled}
            name={zo.fields.breed()}
          >
            <SelectTrigger className="px-3.5 py-3">
              <SelectValue placeholder="Choose a field type" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="w-full min-w-[300px]"
              align="start"
            >
              <div className=" max-h-[320px] overflow-auto">
                {BREEDS.map((value) => (
                  <SelectItem value={value} key={value}>
                    <span className="mr-4 text-[14px] text-gray-700">
                      {value}
                    </span>
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        </FormRow>

        {/* Tag Number */}
        <FormRow rowLabel={"Tag Number"} className="border-b-0 pb-[10px]">
          <Input
            label="Tag Number"
            hideLabel
            name={zo.fields.tagNumber()}
            disabled={disabled}
            error={
              actionData?.errors?.title?.message ||
              zo.errors.tagNumber()?.message
            }
            autoFocus
            className="w-full"
            defaultValue={tagNumber || ""}
          />
        </FormRow>

        <FormRow
          rowLabel={"Date of birth"}
          subHeading={<p>Choose the date of birth of the cattle.</p>}
        >
          <Input
            type="date"
            label="Date of birth"
            name={zo.fields.dateOfBirth()}
            disabled={disabled}
            hideLabel
            required
            defaultValue={dateOfBirth?.toString() || ""}
          />
        </FormRow>

        <div>
          {/* Health status */}
          <FormRow
            rowLabel={"Health Status"}
            subHeading={<p>What is the health status of the cattle.</p>}
            className="border-b-0 py-[10px]"
          >
            <InnerLabel hideLg>Health status</InnerLabel>
            <Select
              defaultValue={healthStatus || "Healthy"}
              disabled={disabled}
              name={zo.fields.healthStatus()}
            >
              <SelectTrigger className="px-3.5 py-3">
                <SelectValue placeholder="Choose a field type" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="w-full min-w-[300px]"
                align="start"
              >
                <div className=" max-h-[320px] overflow-auto">
                  {HEALTH_STATUS.map((value) => (
                    <SelectItem value={value} key={value}>
                      <span className="mr-4 text-[14px] text-gray-700">
                        {value}
                      </span>
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
          </FormRow>
          {/* Vaccination Records */}
          <FormRow
            rowLabel={"Vaccination Records"}
            subHeading={<p>Enter vaccination records for Cattle.</p>}
          >
            <Input
              inputType="textarea"
              maxLength={1000}
              label={"Vaccination Records"}
              name={zo.fields.vaccinationRecords()}
              defaultValue={vaccinationRecords || ""}
              hideLabel
              placeholder="Add vaccination records for the cattle"
              disabled={disabled}
              data-test-id="vacination-records"
              className="w-full"
              required={zodFieldIsRequired(FormSchema.shape.vaccinationRecords)}
            />
          </FormRow>
        </div>

        <div>
          <FormRow
            rowLabel="Male Parent"
            subHeading={<p>Select the male parent of the cattle.</p>}
            className="border-b-0 py-[10px]"
            required={zodFieldIsRequired(FormSchema.shape.sireId)}
          >
            <input type="hidden" name="sireId" value={sireId || ""} />
            <DynamicSelect
              disabled={disabled}
              fieldName="sireId"
              defaultValue={sireId || undefined}
              model={{ name: "cattle", queryKey: "name" }}
              contentLabel="Male Parent"
              label="Male Parent"
              hideLabel
              initialDataKey="maleCattle"
              countKey="totalMaleCattle"
              closeOnSelect
              allowClear
              renderItem={({ name }) => (
                <div className="flex items-center gap-2">
                  <div>{name}</div>
                </div>
              )}
            />
          </FormRow>
        </div>
        <div>
          <FormRow
            rowLabel="Female Parent"
            subHeading={<p>Select the female parent of the cattle.</p>}
            className="py-[10px]"
            required={zodFieldIsRequired(FormSchema.shape.damId)}
          >
            <input type="hidden" name="damId" value={damId || ""} />
            <DynamicSelect
              disabled={disabled}
              fieldName="damId"
              defaultValue={damId || undefined}
              model={{ name: "cattle", queryKey: "name" }}
              contentLabel="Female Parent"
              label="Female Parent"
              hideLabel
              initialDataKey="femaleCattle"
              countKey="totalFemaleCattle"
              closeOnSelect
              allowClear
              renderItem={({ name }) => (
                <div className="flex items-center gap-2">
                  <div>{name}</div>
                </div>
              )}
            />
          </FormRow>
        </div>

        <div>
          <FormRow
            rowLabel="Kraal"
            subHeading={<p>Select the kraal to which the cattle belongs to.</p>}
            className="py-[10px]"
            required={true}
          >
            <input type="hidden" name="kraalId" value={kraalId || ""} />
            {!kraalId && (
              <DynamicSelect
                disabled={disabled}
                fieldName="kraalId"
                defaultValue={kraalId || undefined}
                model={{ name: "kraal", queryKey: "name" }}
                contentLabel="Kraal"
                label="Kraal"
                hideLabel
                initialDataKey="kraals"
                countKey="totalKraals"
                closeOnSelect
                allowClear
                renderItem={({ name }) => (
                  <div className="flex items-center gap-2">
                    <div>{name}</div>
                  </div>
                )}
                required={true}
              />
            )}
          </FormRow>
        </div>

        <FormRow className="border-y-0 pb-0 pt-5" rowLabel="">
          <div className="ml-auto">
            <Button type="submit" disabled={disabled}>
              Save
            </Button>
          </div>
        </FormRow>
      </Form>
    </Card>
  );
};

const Actions = ({ disabled }: { disabled: boolean }) => (
  <>
    <ButtonGroup>
      <Button to=".." variant="secondary" disabled={disabled}>
        Cancel
      </Button>
      <AddAnother disabled={disabled} />
    </ButtonGroup>

    <Button type="submit" disabled={disabled}>
      Save
    </Button>
  </>
);

const AddAnother = ({ disabled }: { disabled: boolean }) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="submit"
          variant="secondary"
          disabled={disabled}
          name="addAnother"
          value="true"
        >
          Add another
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-sm">Save the asset and add a new one</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
