import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect, redirectDocument } from "@remix-run/node";
import { useLoaderData } from "react-router";
import { CattleForm, NewCattleFormSchema } from "~/components/cattle/form";
import {
  createCattle,
  getAllEntriesForCreateAndEditCattle,
} from "~/modules/asset/service.server";
import { assertWhetherQrBelongsToCurrentOrganization } from "~/modules/qr/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { makeShelfError } from "~/utils/error";
import { assertIsPost, data, error, parseData } from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

const title = "New cattle";
const header = {
  title,
};

export async function loader({ context, request, params }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  const { kraalId } = params;

  try {
    const { organizationId } = await requirePermission({
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

    const {
      kraals,
      maleCattle,
      totalKraals,
      femaleCattle,
      totalMaleCattle,
      totalFemaleCattle,
    } = await getAllEntriesForCreateAndEditCattle({
      userId,
    });

    return json(
      data({
        kraals,
        header,
        maleCattle,
        totalKraals,
        femaleCattle,
        totalMaleCattle,
        totalFemaleCattle,
        kraalId,
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

    const FormSchema = NewCattleFormSchema;

    /** Here we need to clone the request as we need 2 different streams:
     * 1. Access form data for creating asset
     * 2. Access form data via upload handler to be able to upload the file
     *
     * This solution is based on : https://github.com/remix-run/remix/issues/3971#issuecomment-1222127635
     */
    const clonedRequest = request.clone();

    const formData = await clonedRequest.formData();

    const payload = parseData(formData, FormSchema);

    const {
      name,
      gender,
      breed,
      dateOfBirth,
      healthStatus,
      tagNumber,
      isOx,
      vaccinationRecords,
      damId,
      sireId,
      kraalId,
      addAnother,
    } = payload;

    await createCattle({
      name,
      gender,
      breed,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      healthStatus,
      tagNumber,
      isOx,
      vaccinationRecords: vaccinationRecords || null,
      damId: damId || null,
      sireId: sireId || null,
      kraalId: kraalId || null,
      userId,
    });

    // // Not sure how to handle this failing as the asset is already created
    // await updateAssetMainImage({
    //   request,
    //   assetId: asset.id,
    //   userId: authSession.userId,
    // });

    sendNotification({
      title: "Cattle created",
      message: "Your cattle has been created successfully",
      icon: { name: "success", variant: "success" },
      senderId: authSession.userId,
    });

    /** If the user used the add-another button, we reload the document to reset the form */
    if (addAnother) {
      return redirectDocument(`/kraals/${kraalId}/cattle/new`);
    }

    return redirect(`/kraals/${kraalId}/cattle`);
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    return json(error(reason), { status: reason.status });
  }
}

export default function CreateCattlePage() {
  const data = useLoaderData() as {
    kraalId: string | undefined;
  };

  return (
    <>
      <div>
        <CattleForm kraalId={data.kraalId} />
      </div>
    </>
  );
}
