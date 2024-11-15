import { json, redirect } from "@remix-run/node";
import type {
  ActionFunctionArgs,
  MetaFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useAtomValue } from "jotai";
import { z } from "zod";
import { dynamicTitleAtom } from "~/atoms/dynamic-title-atom";
import { CattleForm, NewCattleFormSchema } from "~/components/cattle/form";
import Header from "~/components/layout/header";
import type { HeaderData } from "~/components/layout/header/types";
import { getAllEntriesForCreateAndEditCattle } from "~/modules/asset/service.server";
import { getCattle, updateCattle } from "~/modules/cattle/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { makeShelfError } from "~/utils/error";
import { data, error, getParams, parseData } from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

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

    const payload = parseData(await request.formData(), NewCattleFormSchema, {
      additionalData: { userId, organizationId, id },
    });

    const {
      name,
      sireId,
      damId,
      kraalId,
      isOx,
      gender,
      dateOfBirth,
      vaccinationRecords,
      healthStatus,
      tagNumber,
    } = payload;

    await updateCattle({
      id,
      userId,
      name,
      sireId,
      damId,
      kraalId,
      isOx,
      gender,
      dateOfBirth,
      vaccinationRecords,
      healthStatus,
      tagNumber,
    });

    sendNotification({
      title: "Cattle updated",
      message: "Your cattle has been updated successfully",
      icon: { name: "success", variant: "success" },
      senderId: userId,
    });

    return redirect(`/cattle/${id}`);
  } catch (cause) {
    const reason = makeShelfError(cause, { userId, id });
    return json(error(reason), { status: reason.status });
  }
}

export default function CattleEditPage() {
  const name = useAtomValue(dynamicTitleAtom);
  const hasName = name !== "";
  const { cattle } = useLoaderData<typeof loader>();

  return (
    <>
      <Header title={hasName ? name : cattle.name} />
      <div className=" items-top flex justify-between">
        <CattleForm
          id={cattle.id}
          name={cattle.name}
          dateOfBirth={cattle.dateOfBirth || undefined}
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
