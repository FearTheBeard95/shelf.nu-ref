import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect, redirectDocument } from "@remix-run/node";
import { useAtomValue } from "jotai";
import { dynamicTitleAtom } from "~/atoms/dynamic-title-atom";
import { KraalForm, NewKraalFormSchema } from "~/components/kraals/form";
import Header from "~/components/layout/header";
import {
  createKraal,
  getAllEntriesForCreateAndEdit,
} from "~/modules/asset/service.server";
import { getActiveCustomFields } from "~/modules/custom-field/service.server";
import { assertWhetherQrBelongsToCurrentOrganization } from "~/modules/qr/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { mergedSchema } from "~/utils/custom-fields";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { makeShelfError } from "~/utils/error";
import {
  assertIsPost,
  data,
  error,
  getCurrentSearchParams,
  parseData,
} from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";
import { slugify } from "~/utils/slugify";

const title = "New kraal";
const header = {
  title,
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const { organizationId, currentOrganization } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.asset,
      action: PermissionAction.create,
    });
    /**
     * We need to check if the QR code passed in the URL belongs to the current org
     * This is relevant whenever the user is trying to link a new asset with an existing QR code
     * */
    await assertWhetherQrBelongsToCurrentOrganization({
      request,
      organizationId,
    });

    const { categories, totalCategories, tags, locations, totalLocations } =
      await getAllEntriesForCreateAndEdit({
        organizationId,
        request,
      });

    const searchParams = getCurrentSearchParams(request);

    const customFields = await getActiveCustomFields({
      organizationId,
      category: searchParams.get("category"),
    });

    return json(
      data({
        header,
        categories,
        totalCategories,
        tags,
        totalTags: tags.length,
        locations,
        totalLocations,
        currency: currentOrganization?.currency,
        customFields,
      })
    );
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    throw json(error(reason));
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? appendToMetaTitle(data.header.title) : "" },
];

export const handle = {
  breadcrumb: () => <span>{title}</span>,
};

export async function action({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    assertIsPost(request);

    const { organizationId } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.asset,
      action: PermissionAction.create,
    });

    const searchParams = getCurrentSearchParams(request);

    const customFields = await getActiveCustomFields({
      organizationId,
      category: searchParams.get("category"),
    });

    const FormSchema = mergedSchema({
      baseSchema: NewKraalFormSchema,
      customFields: customFields.map((cf) => ({
        id: cf.id,
        name: slugify(cf.name),
        helpText: cf?.helpText || "",
        required: cf.required,
        type: cf.type.toLowerCase() as "text" | "number" | "date" | "boolean",
        options: cf.options,
      })),
    });

    /** Here we need to clone the request as we need 2 different streams:
     * 1. Access form data for creating asset
     * 2. Access form data via upload handler to be able to upload the file
     *
     * This solution is based on : https://github.com/remix-run/remix/issues/3971#issuecomment-1222127635
     */
    const clonedRequest = request.clone();

    const formData = await clonedRequest.formData();

    const payload = parseData(formData, FormSchema);

    const { name, description, capacity, newLocationId } = payload;

    await createKraal({
      name,
      description,
      capacity,
      locationId: newLocationId,
      userId,
    });

    // // Not sure how to handle this failing as the asset is already created
    // await updateAssetMainImage({
    //   request,
    //   assetId: kraal.id,
    //   userId: authSession.userId,
    // });

    sendNotification({
      title: "Kraal created",
      message: "Your kraal has been created successfully",
      icon: { name: "success", variant: "success" },
      senderId: authSession.userId,
    });

    // await createNote({
    //   content: `Kraal was created by **${kraal.user.firstName?.trim()} ${kraal.user.lastName?.trim()}**`,
    //   type: "UPDATE",
    //   userId: authSession.userId,
    //   assetId: kraal.id,
    // });

    // if (kraal.location) {
    //   await createNote({
    //     content: `**${kraal.user.firstName?.trim()} ${kraal.user.lastName?.trim()}** set the location of **${kraal.name?.trim()}** to *[${kraal.location.name.trim()}](/locations/${
    //       kraal.location.id
    //     })**`,
    //     type: "UPDATE",
    //     userId: authSession.userId,
    //     assetId: kraal.id,
    //   });
    // }

    /** If the user used the add-another button, we reload the document to reset the form */
    if (payload.addAnother) {
      return redirectDocument(`/kraals/new?`);
    }

    return redirect(`/kraals`);
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    return json(error(reason), { status: reason.status });
  }
}

export default function NewAssetPage() {
  const title = useAtomValue(dynamicTitleAtom);

  return (
    <>
      <Header title={title ? title : "Untitled Kraal"} />
      <div>
        <KraalForm />
      </div>
    </>
  );
}
