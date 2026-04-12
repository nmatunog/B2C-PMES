import { Test } from "@nestjs/testing";
import { AuthService } from "../auth/auth.service";
import { PmesService } from "./pmes.service";
import { PrismaService } from "../prisma/prisma.service";

describe("PmesService", () => {
  it("submitSession runs transaction", async () => {
    const tx = {
      participant: {
        upsert: jest.fn().mockResolvedValue({
          id: "p1",
          fullName: "A",
          email: "a@test.com",
          phone: "1",
          dob: "2000-01-01",
          gender: "x",
        }),
      },
      pmesRecord: {
        create: jest.fn().mockResolvedValue({
          id: "r1",
          score: 8,
          passed: true,
          timestamp: new Date("2026-01-01T00:00:00.000Z"),
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    const auth = { updateFirebasePrimaryEmail: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        PmesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: auth },
      ],
    }).compile();
    const service = module.get(PmesService);
    const out = await service.submitSession({
      fullName: "A",
      email: "a@test.com",
      phone: "1",
      dob: "2000-01-01",
      gender: "x",
      score: 8,
      passed: true,
    });
    expect(out.id).toBe("r1");
    expect(out.passed).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
