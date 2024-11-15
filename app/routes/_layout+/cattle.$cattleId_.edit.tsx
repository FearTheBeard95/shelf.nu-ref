import {
  json,
  unstable_parseMultipartFormData,
  unstable_createMemoryUploadHandler,
} from "@remix-run/node";
import type {
  ActionFunctionArgs,
  MetaFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useAtomValue } from "jotai";
import invariant from "tiny-invariant";
import { z } from "zod";
import { dynamicTitleAtom } from "~/atoms/dynamic-title-atom";
import { CattleForm, NewCattleFormSchema } from "~/components/cattle/form";
import Header from "~/components/layout/header";
import type { HeaderData } from "~/components/layout/header/types";
import { getAllEntriesForCreateAndEditCattle } from "~/modules/asset/service.server";
import { getCattle } from "~/modules/cattle/service.server";
import { updateLocation } from "~/modules/location/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { makeShelfError } from "~/utils/error";
import { data, error, getParams, parseData } from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";
import { MAX_SIZE } from "./locations.new";

export async function loader({ context, params }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;
  const { cattleId: id } = getParams(
    params,
    z.object({ cattleId: z.string() }),
    {
      additionalData: { userId },
    }
  );

  try {
    const { cattle } = await getCattle({ id });

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

    const header: HeaderData = {
      title: `Edit | ${cattle.name}`,
    };

    return json(
      data({
        kraals,
        header,
        maleCattle,
        totalKraals,
        femaleCattle,
        totalMaleCattle,
        totalFemaleCattle,
        cattle,
        kraalId: cattle.kraalId,
      })
    );
  } catch (cause) {
    const reason = makeShelfError(cause, { userId, id });
    throw json(error(reason), { status: reason.status });
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? appendToMetaTitle(data.header.title) : "" },
];

export const handle = {
  breadcrumb: () => <span>Edit</span>,
};

export async function action({ context, request, params }: ActionFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;
  const { cattleId: id } = getParams(
    params,
    z.object({ cattleId: z.string() }),
    {
      additionalData: { userId },
    }
  );

  try {
    const { organizationId } = await requirePermission({
      userId: authSession.userId,
      request,
      entity: PermissionEntity.location,
      action: PermissionAction.update,
    });
    const clonedRequest = request.clone();

    const payload = parseData(await request.formData(), NewCattleFormSchema, {
      additionalData: { userId, organizationId, id },
    });

    const { name } = payload;

    const formDataFile = await unstable_parseMultipartFormData(
      clonedRequest,
      unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE })
    );

    const file = formDataFile.get("image") as File | null;
    invariant(file instanceof File, "file not the right type");

    await updateLocation({
      id,
      userId: authSession.userId,
      name,
      image: file || null,
      organizationId,
    });

    sendNotification({
      title: "Location updated",
      message: "Your location  has been updated successfully",
      icon: { name: "success", variant: "success" },
      senderId: userId,
    });

    return json(data({ success: true }));
  } catch (cause) {
    const reason = makeShelfError(cause, { userId, id });
    return json(error(reason), { status: reason.status });
  }
}

export default function LocationEditPage() {
  const name = useAtomValue(dynamicTitleAtom);
  const hasName = name !== "";
  const { cattle } = useLoaderData<typeof loader>();

  return (
    <>
      <Header title={hasName ? name : cattle.name} />
      <div className=" items-top flex justify-between">
        <CattleForm
          name={cattle.name}
          dateOfBirth={cattle.dateOfBirth ? new Date(cattle.dateOfBirth) : null}
          tagNumber={cattle.tagNumber}
          breed={cattle.breed}
          damId={cattle.damId}
          sireId={cattle.sireId}
          gender={cattle.gender}
          kraalId={cattle.kraalId}
        />
      </div>
    </>
  );
}
