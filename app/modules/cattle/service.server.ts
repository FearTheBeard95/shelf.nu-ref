import type { Cattle, Prisma, User } from "@prisma/client";
import { db } from "~/database/db.server";
import { getSupabaseAdmin } from "~/integrations/supabase/client";
import { dateTimeInUnix } from "~/utils/date-time-in-unix";
import type { ErrorLabel } from "~/utils/error";
import { maybeUniqueConstraintViolation, ShelfError } from "~/utils/error";
import { Logger } from "~/utils/logger";
import { createSignedUrl, parseFileFormData } from "~/utils/storage.server";

const label: ErrorLabel = "Cattle";

export async function getCattle(
  params: Pick<Cattle, "id"> & {
    /** Page number. Starts at 1 */
    page?: number;
    /** cattle to be loaded per page with the location */
    perPage?: number;
    search?: string | null;
  }
) {
  const { id, page = 1, perPage = 8, search } = params;

  const skip = page > 1 ? (page - 1) * perPage : 0;
  const take = perPage >= 1 ? perPage : 8; // min 1 and max 25 per page

  /** Build where object for querying related cattle */
  let offSpringWhere: Prisma.CattleWhereInput = {};

  if (search) {
    offSpringWhere.name = {
      contains: search,
      mode: "insensitive",
    };
  }

  try {
    const cattle = await db.cattle.findFirstOrThrow({
      where: { id },
      include: {
        cattleKraalAssignments: true,
        sire: true,
        dam: true,
        offspringAsDam: {
          skip,
          take,
          where: offSpringWhere,
        },
        offspringAsSire: {
          skip,
          take,
          where: offSpringWhere,
        },
      },
    });

    const kraalId = cattle.cattleKraalAssignments.find(
      (kraal) => kraal.endDate === null
    )?.kraalId;

    const age = cattle.dateOfBirth
      ? Math.round(new Date().getFullYear() - cattle.dateOfBirth.getFullYear())
      : null;

    const totalChildren =
      cattle.offspringAsDam.length + cattle.offspringAsSire.length;

    return {
      cattle: {
        ...cattle,
        age,
        totalChildren,
        kraalId,
      },
    };
  } catch (cause) {
    throw new ShelfError({
      cause,
      message: "Something went wrong while fetching cattle",
      additionalData: { ...params },
      label,
    });
  }
}

export async function updateCattle(payload: {
  id: Cattle["id"];
  userId: User["id"];
  name?: Cattle["name"];
  mainImage?: Cattle["mainImage"];
  tagNumber?: Cattle["tagNumber"];
  breed?: Cattle["breed"];
  gender?: Cattle["gender"];
  isOx?: Cattle["isOx"];
  dateOfBirth?: string;
  healthStatus?: Cattle["healthStatus"];
  vaccinationRecords?: Cattle["vaccinationRecords"];
  sireId?: Cattle["sireId"];
  damId?: Cattle["damId"];
  kraalId?: Cattle["id"];
}) {
  const {
    id,
    userId,
    name,
    mainImage,
    tagNumber,
    breed,
    gender,
    isOx,
    dateOfBirth,
    healthStatus,
    vaccinationRecords,
    sireId,
    damId,
    kraalId,
  } = payload;

  try {
    const data = {
      name: name || undefined,
      mainImage: mainImage || undefined,
      tagNumber: tagNumber || undefined,
      breed: breed || undefined,
      gender,
      isOx: isOx || false,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      healthStatus: healthStatus || undefined,
      vaccinationRecords: vaccinationRecords || undefined,
      sireId: sireId || undefined,
      damId: damId || undefined,
    };

    // update cattle
    await db.cattle.update({
      where: { id },
      data,
    });

    // update kraal assignment
    if (kraalId) {
      // check if not already assigned
      const kraalAssignment = await db.cattleKraalAssignment.findFirst({
        where: {
          cattleId: id,
          endDate: null,
        },
      });

      if (!kraalAssignment) {
        await db.cattleKraalAssignment.create({
          data: {
            cattleId: id,
            kraalId,
            startDate: new Date(),
          },
        });
      } else if (kraalAssignment.kraalId !== kraalId) {
        await db.cattleKraalAssignment.update({
          where: {
            id: kraalAssignment.id,
          },
          data: {
            endDate: new Date(),
          },
        });

        await db.cattleKraalAssignment.create({
          data: {
            cattleId: id,
            kraalId,
            startDate: new Date(),
          },
        });
      }
    }
  } catch (cause) {
    throw maybeUniqueConstraintViolation(cause, "Cattle", {
      additionalData: {
        id,
        userId,
      },
    });
  }
}

export async function updateCattleMainImage({
  request,
  cattleId,
  userId,
}: {
  request: Request;
  cattleId: string;
  userId: User["id"];
}) {
  try {
    const fileData = await parseFileFormData({
      request,
      bucketName: "cattle",
      newFileName: `${userId}/${cattleId}/main-image-${dateTimeInUnix(
        Date.now()
      )}`,
      resizeOptions: {
        width: 800,
        withoutEnlargement: true,
      },
    });

    const image = fileData.get("mainImage") as string;

    if (!image) {
      return;
    }

    const signedUrl = await createSignedUrl({
      filename: image,
      bucketName: "cattle",
    });

    await updateCattle({
      id: cattleId,
      mainImage: signedUrl,
      userId,
    });
    await deleteOtherImages({ userId, cattleId, data: { path: image } });
  } catch (cause) {
    throw new ShelfError({
      cause,
      message: "Something went wrong while updating asset main image",
      additionalData: { cattleId, userId },
      label,
    });
  }
}

function extractMainImageName(path: string): string | null {
  const match = path.match(/main-image-[\w-]+\.\w+/);
  if (match) {
    return match[0];
  } else {
    // Handle case without file extension
    const matchNoExt = path.match(/main-image-[\w-]+/);
    return matchNoExt ? matchNoExt[0] : null;
  }
}

export async function deleteOtherImages({
  userId,
  cattleId,
  data,
}: {
  userId: string;
  cattleId: string;
  data: { path: string };
}): Promise<void> {
  try {
    if (!data?.path) {
      // asset image stroage failure. do nothing
      return;
    }
    const currentImage = extractMainImageName(data.path);
    if (!currentImage) {
      //do nothing
      return;
    }
    const { data: deletedImagesData, error: deletedImagesError } =
      await getSupabaseAdmin()
        .storage.from("cattle")
        .list(`${userId}/${cattleId}`);

    if (deletedImagesError) {
      throw new Error(`Error fetching images: ${deletedImagesError.message}`);
    }

    // Extract the image names and filter out the one to keep
    const imagesToDelete = (
      deletedImagesData?.map((image) => image.name) || []
    ).filter((image) => image !== currentImage);

    // Delete the images
    await Promise.all(
      imagesToDelete.map((image) =>
        getSupabaseAdmin()
          .storage.from("cattle")
          .remove([`${userId}/${cattleId}/${image}`])
      )
    );
  } catch (cause) {
    Logger.error(
      new ShelfError({
        cause,
        title: "Oops, deletion of other cattle images failed",
        message: "Something went wrong while deleting other cattle images",
        additionalData: { cattleId, userId },
        label,
      })
    );
  }
}
