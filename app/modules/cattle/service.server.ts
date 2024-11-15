import type { Cattle, Prisma, User } from "@prisma/client";
import { db } from "~/database/db.server";
import type { ErrorLabel } from "~/utils/error";
import { maybeUniqueConstraintViolation, ShelfError } from "~/utils/error";

const label: ErrorLabel = "Cattle";

export async function getCattle(
  params: Pick<Cattle, "id"> & {
    /** Page number. Starts at 1 */
    page?: number;
    /** Assets to be loaded per page with the location */
    perPage?: number;
    search?: string | null;
  }
) {
  const { id, page = 1, perPage = 8, search } = params;

  const skip = page > 1 ? (page - 1) * perPage : 0;
  const take = perPage >= 1 ? perPage : 8; // min 1 and max 25 per page

  /** Build where object for querying related assets */
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
