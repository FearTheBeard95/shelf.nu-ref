import type { Kraal } from "@prisma/client";
import {
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { useAtom } from "jotai";

import { useZorm } from "react-zorm";
import { z } from "zod";
import { updateDynamicTitleAtom } from "~/atoms/dynamic-title-atom";
import type { loader } from "~/routes/_layout+/assets.$assetId_.edit";
import type { CustomFieldZodSchema } from "~/utils/custom-fields";
import { mergedSchema } from "~/utils/custom-fields";
import { isFormProcessing } from "~/utils/form";
import { tw } from "~/utils/tw";

import { zodFieldIsRequired } from "~/utils/zod";
import AssetCustomFields from "./custom-fields-inputs";
import { Form } from "../custom-form";
import DynamicSelect from "../dynamic-select/dynamic-select";
import FormRow from "../forms/form-row";
import Input from "../forms/input";
import { AbsolutePositionedHeaderActions } from "../layout/header/absolute-positioned-header-actions";
import { Button } from "../shared/button";
import { ButtonGroup } from "../shared/button-group";
import { Card } from "../shared/card";
import { Image } from "../shared/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../shared/tooltip";

export const NewKraalFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name is required")
    .transform((val) => val.trim()), // We trim to avoid white spaces at start and end

  description: z.string().transform((val) => val.trim()),
  capacity: z
    .number()
    .or(z.string().transform((val) => Number(val)))
    .default(0),
  newLocationId: z.string().optional(),
  /** This holds the value of the current location. We need it for comparison reasons on the server.
   * We send it as part of the form data and compare it with the current location of the asset and prevent querying the database if it's the same.
   */
  currentLocationId: z.string().optional(),
  addAnother: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

/** Pass props of the values to be used as default for the form fields */
interface Props {
  id?: Kraal["id"];
  name?: Kraal["name"];
  // mainImage?: Kraal["mainImage"];
  // mainImageExpiration?: string;
  capacity?: Kraal["capacity"];
  location?: Kraal["locationId"];
  description?: Kraal["description"];
}

export const KraalForm = ({ name, capacity, location, description }: Props) => {
  const navigation = useNavigation();

  const customFields = useLoaderData<typeof loader>().customFields.map(
    (cf) =>
      cf.active && {
        id: cf.id,
        name: cf.name,
        helpText: cf?.helpText || "",
        required: cf.required,
        type: cf.type.toLowerCase() as "text" | "number" | "date" | "boolean",
        options: cf.options,
      }
  ) as CustomFieldZodSchema[];

  const FormSchema = mergedSchema({
    baseSchema: NewKraalFormSchema,
    customFields,
  });

  const zo = useZorm("NewQuestionWizardScreen", FormSchema);
  const disabled = isFormProcessing(navigation.state);

  // const fileError = useAtomValue(fileErrorAtom);
  // const [, validateFile] = useAtom(validateFileAtom);
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
            <p>Basic information about your kraal.</p>
          </div>
          <div className="hidden flex-1 justify-end gap-2 md:flex">
            <Actions disabled={disabled} />
          </div>
        </div>

        <FormRow
          rowLabel={"Name"}
          className="border-b-0 pb-[10px]"
          required={true}
        >
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
            required={true}
          />
        </FormRow>

        {/* <FormRow rowLabel={"Main image"} className="pt-[10px]">
          <div className="flex items-center gap-2">
            {id && mainImage && mainImageExpiration ? (
              <AssetImage
                className="size-16"
                asset={{
                  assetId: id,
                  mainImage: mainImage,
                  mainImageExpiration: new Date(mainImageExpiration),
                  alt: "",
                }}
              />
            ) : null}
            <div>
              <p className="hidden lg:block">
                Accepts PNG, JPG or JPEG (max.4 MB)
              </p>
              <Input
                disabled={disabled}
                accept="image/png,.png,image/jpeg,.jpg,.jpeg"
                name="mainImage"
                type="file"
                onChange={validateFile}
                label={"Main image"}
                hideLabel
                error={fileError}
                className="mt-2"
                inputClassName="border-0 shadow-none p-0 rounded-none"
              />
              <p className="mt-2 lg:hidden">
                Accepts PNG, JPG or JPEG (max.4 MB)
              </p>
            </div>
          </div>
        </FormRow> */}

        <div>
          <FormRow
            rowLabel={"Description"}
            subHeading={
              <p>
                This is the initial object description. It will be shown on the
                kraal's overview page. You can always change it. Maximum 1000
                characters.
              </p>
            }
            className="border-b-0"
            required={zodFieldIsRequired(FormSchema.shape.description)}
          >
            <Input
              inputType="textarea"
              maxLength={1000}
              label={"Description"}
              name={zo.fields.description()}
              defaultValue={description || ""}
              hideLabel
              placeholder="Add a description for your asset."
              disabled={disabled}
              data-test-id="assetDescription"
              className="w-full"
              required={zodFieldIsRequired(FormSchema.shape.description)}
            />
          </FormRow>
        </div>

        <FormRow
          rowLabel="Capacity"
          subHeading={
            <p>
              Capacity is the number of cattle currently in the kraal. This will
              be set to 0 if left empty.
            </p>
          }
          className="border-b-0 pb-[10px]"
          required={zodFieldIsRequired(FormSchema.shape.capacity)}
        >
          <Input
            type="number"
            label="Capacity"
            hideLabel
            name={zo.fields.capacity()}
            disabled={disabled}
            error={
              actionData?.errors?.title?.message ||
              zo.errors.capacity()?.message
            }
            autoFocus
            className="w-full"
            defaultValue={capacity || 0}
          />
        </FormRow>

        <FormRow
          rowLabel="Location"
          subHeading={
            <p>
              A location is a place where the Kraal is located. If you don't see
              the location you are looking for, you can create a new one.
              <Link to="/locations/new" className="text-gray-600 underline">
                Create locations
              </Link>
            </p>
          }
          className="border-b-0 py-[10px]"
          required={zodFieldIsRequired(FormSchema.shape.newLocationId)}
        >
          <input
            type="hidden"
            name="currentLocationId"
            value={location || ""}
          />
          <DynamicSelect
            disabled={disabled}
            fieldName="newLocationId"
            defaultValue={location || undefined}
            model={{ name: "location", queryKey: "name" }}
            contentLabel="Locations"
            label="Location"
            hideLabel
            initialDataKey="locations"
            countKey="totalLocations"
            closeOnSelect
            allowClear
            extraContent={
              <Button
                to="/locations/new"
                variant="link"
                icon="plus"
                className="w-full justify-start pt-4"
                target="_blank"
              >
                Create new location
              </Button>
            }
            renderItem={({ name, metadata }) => (
              <div className="flex items-center gap-2">
                <Image
                  imageId={metadata.imageId}
                  alt="img"
                  className={tw(
                    "size-6 rounded-[2px] object-cover",
                    metadata.description ? "rounded-b-none border-b-0" : ""
                  )}
                />
                <div>{name}</div>
              </div>
            )}
          />
        </FormRow>

        <AssetCustomFields zo={zo} schema={FormSchema} />

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
        <p className="text-sm">Save the kraal and add a new one</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
