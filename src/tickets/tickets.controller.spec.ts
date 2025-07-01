import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { DbModule } from '../db.module';
import { TicketsController } from './tickets.controller';

describe('TicketsController', () => {
  let controller: TicketsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      imports: [DbModule],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('should be defined', async () => {
    expect(controller).toBeDefined();

    const res = await controller.findAll();
    console.log(res);
  });

  describe('create', () => {
    describe('managementReport', () => {
      it('creates managementReport ticket', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });

        expect(ticket.category).toBe(TicketCategory.accounting);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there are multiple accountants, assign the last one', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });
        const user2 = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });

        expect(ticket.category).toBe(TicketCategory.accounting);
        expect(ticket.assigneeId).toBe(user2.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there is no accountant, throw', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.managementReport,
          }),
        ).rejects.toEqual(
          new ConflictException(
            `Cannot find user with role accountant to create a ticket`,
          ),
        );
      });
    });

    describe('registrationAddressChange', () => {
      it('creates registrationAddressChange ticket', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        expect(ticket.category).toBe(TicketCategory.corporate);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there are multiple secretaries, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(
            `Multiple users with role corporateSecretary. Cannot create a ticket`,
          ),
        );
      });

      it('if there is no secretary, throw', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(
            `Cannot find user with role corporateSecretary to create a ticket`,
          ),
        );
      });

      it('if the company already has a ticket with the same type and no corporateSecretary available and director user exist', async() => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User Corporate Secretary',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        const directorUser = await User.create({
          name: 'Test User Director',
          role: UserRole.director,
          companyId: company.id,
        })

        // corporateSecretary
        await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange
        })

        await expect(ticket.category).toBe(TicketCategory.corporate)
        await expect(ticket.assigneeId).toBe(directorUser.id)
        await expect(ticket.status).toBe(TicketStatus.open)
      })

      it('if the company already has a ticket with the same type and no corporateSecretary available and no user with director role exist, throw', async() => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User Corporate Secretary',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        // corporateSecretary
        await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange
          })
        ).rejects.toEqual(
          new ConflictException(`Cannot find user with role ${UserRole.director} to create a ticket, ${UserRole.corporateSecretary} is already handling a ticket`)
        )
      })

      it ('if the company already has a ticket with the same type, and there are multiple directors, throw', async() => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User Corporate Secretary',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        await User.create({
          name: 'Test User Director 1',
          role: UserRole.director,
          companyId: company.id,
        });

        await User.create({
          name: 'Test User Director 2',
          role: UserRole.director,
          companyId: company.id,
        });

        // corporateSecretary
        await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange
        })

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          })
        ).rejects.toEqual(
          new ConflictException(`Multiple users with role ${UserRole.director}. Cannot create a ticket, ${UserRole.corporateSecretary} is already handling a ticket`)
        )
      })

      it('if the company already has a ticket with the same type and no corporateSecretary available and no director available, throw', async() => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User Corporate Secretary',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        await User.create({
          name: 'Test User Director',
          role: UserRole.director,
          companyId: company.id,
        });

        // corporateSecretary
        await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        // director
        await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange
          })
        ).rejects.toEqual(
          new ConflictException("Company cannot take registrationAddressChange ticket anymore")
        )
      })
    });

    describe('invalid parameter', () => {
      it('unknown ticket type, throw', async() => {
        const unknownTicketType = 'unknown' as TicketType
        const company = await Company.create({ name: 'test' });

        await expect(
          controller.create({
            companyId: company.id,
            type: unknownTicketType,
          })
        ).rejects.toEqual(
          new ConflictException(
            `There is no category and user role with this ticket type ${unknownTicketType}`
          )
        )
      })

      it('unknown company id, throw', async() => {
        const unknownCompanyId = 999;
        await expect(
          controller.create({
            companyId: unknownCompanyId,
            type: TicketType.registrationAddressChange
          })
        ).rejects.toEqual(
          new ConflictException(
            `There is no company with this company id ${unknownCompanyId}`
          )
        )
      })
    })

    describe('strikeOff', () => {
      it('create ticket strikeOff', async() => {
        const company = await Company.create({ name: 'test' });
        const userDirector = await User.create({
          name: 'Test User Director',
          role: UserRole.director,
          companyId: company.id,
        });
        const userSecretary = await User.create({
          name: 'Test User Corporate Secretary',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        const otherTicket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        const strikeOffTicket = await controller.create({
          companyId: company.id,
          type: TicketType.strikeOff,
        });

        await expect(strikeOffTicket.assigneeId).toBe(userDirector.id)
        await expect(strikeOffTicket.category).toBe(TicketCategory.management)
        await expect(strikeOffTicket.status).toBe(TicketStatus.open)
        
        const otherTicketUpdatedData = (await Ticket.findAll({
          where: {
            id: otherTicket.id
          }
        }))[0]

        expect(otherTicketUpdatedData.status).toBe(TicketStatus.resolved)
      })

      it('create ticket when strikeoff is on', async() => {
        const company = await Company.create({ name: 'test'})
        const userDirector = await User.create({
          name: 'Test User Director',
          role: UserRole.director,
          companyId: company.id,
        });

        controller.create({
          companyId: company.id,
          type: TicketType.strikeOff,
        });

        expect(
          controller.create({
            companyId: company.id,
            type: TicketType.managementReport
          })
        ).rejects.toEqual(
          new ConflictException(`Company is closing down, no longer accepting new ticket`)
        )
      })
    })
  });
});
