import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './common/supabase/supabase.module';
import { DatabaseModule } from './common/database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './modules/ai/ai.module';
import { SkillsModule } from './modules/skills/skills.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { BankingModule } from './modules/banking/banking.module';
import { AccountsReceivableModule } from './modules/accounts-receivable/accounts-receivable.module';
import { AccountsPayableModule } from './modules/accounts-payable/accounts-payable.module';
import { CashFlowModule } from './modules/cash-flow/cash-flow.module';
import { FixedAssetsModule } from './modules/fixed-assets/fixed-assets.module';
import { PersonalFinanceModule } from './modules/personal-finance/personal-finance.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';
import { WithholdingsModule } from './modules/withholdings/withholdings.module';
import { PurchaseSettlementsModule } from './modules/purchase-settlements/purchase-settlements.module';
import { RemissionGuidesModule } from './modules/remission-guides/remission-guides.module';
import { SriAnnexesModule } from './modules/sri-annexes/sri-annexes.module';
import { TaxDeclarationsModule } from './modules/tax-declarations/tax-declarations.module';
import { SriIntegrationModule } from './modules/sri-integration/sri-integration.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { SalesModule } from './modules/sales/sales.module';
import { ProductionModule } from './modules/production/production.module';
import { PosModule } from './modules/pos/pos.module';
import { CrmModule } from './modules/crm/crm.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LiquidationsModule } from './modules/liquidations/liquidations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TimesheetsModule } from './modules/timesheets/timesheets.module';
import { SubcontractorsModule } from './modules/subcontractors/subcontractors.module';
import { LegalModule } from './modules/legal/legal.module';
import { TaxCalendarModule } from './modules/tax-calendar/tax-calendar.module';
import { RegulatoryAlertsModule } from './modules/regulatory-alerts/regulatory-alerts.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BusinessIntelligenceModule } from './modules/business-intelligence/business-intelligence.module';
import { BenchmarkingModule } from './modules/benchmarking/benchmarking.module';
import { FinancialSimulatorModule } from './modules/financial-simulator/financial-simulator.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { AiReconciliationModule } from './modules/ai-reconciliation/ai-reconciliation.module';
import { AiAnomalyDetectionModule } from './modules/ai-anomaly-detection/ai-anomaly-detection.module';
import { AiDocumentProcessorModule } from './modules/ai-document-processor/ai-document-processor.module';
import { AiTaxAdvisorModule } from './modules/ai-tax-advisor/ai-tax-advisor.module';
import { AiProjectionsModule } from './modules/ai-projections/ai-projections.module';
import { AiScoringModule } from './modules/ai-scoring/ai-scoring.module';
import { AgentSriModule } from './modules/agent-sri/agent-sri.module';
import { AgentIessModule } from './modules/agent-iess/agent-iess.module';
import { AgentBanksModule } from './modules/agent-banks/agent-banks.module';
import { AgentSuperciasModule } from './modules/agent-supercias/agent-supercias.module';
import { AgentCrudModule } from './modules/agent-crud/agent-crud.module';
import { AgentStudioModule } from './modules/agent-studio/agent-studio.module';
import { SkillsFinancialModule } from './modules/skills-financial/skills-financial.module';
import { SkillsSriModule } from './modules/skills-sri/skills-sri.module';
import { SkillsDocumentsModule } from './modules/skills-documents/skills-documents.module';
import { SkillsCommunicationModule } from './modules/skills-communication/skills-communication.module';
import { SkillsCrudModule } from './modules/skills-crud/skills-crud.module';
import { ChannelWhatsappModule } from './modules/channel-whatsapp/channel-whatsapp.module';
import { ChannelTelegramModule } from './modules/channel-telegram/channel-telegram.module';
import { ChannelEmailModule } from './modules/channel-email/channel-email.module';
import { ChannelPortalModule } from './modules/channel-portal/channel-portal.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { IntegrationBanksModule } from './modules/integration-banks/integration-banks.module';
import { IntegrationPaymentsModule } from './modules/integration-payments/integration-payments.module';
import { IntegrationLogisticsModule } from './modules/integration-logistics/integration-logistics.module';
import { IntegrationMarketplaceModule } from './modules/integration-marketplace/integration-marketplace.module';
import { IntegrationBceModule } from './modules/integration-bce/integration-bce.module';
import { QueuesModule } from './modules/queues/queues.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { StorageModule } from './modules/storage/storage.module';
import { SecurityModule } from './modules/security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AiModule, 
    SkillsModule, 
    AgentsModule, 
    ChannelsModule, 
    AuthModule, 
    CompaniesModule, 
    UsersModule, 
    DashboardModule, 
    AccountingModule, 
    BankingModule, 
    AccountsReceivableModule, 
    AccountsPayableModule, 
    CashFlowModule, 
    FixedAssetsModule, 
    PersonalFinanceModule, 
    InvoicingModule, 
    WithholdingsModule, 
    PurchaseSettlementsModule, 
    RemissionGuidesModule, 
    SriAnnexesModule, 
    TaxDeclarationsModule, 
    SriIntegrationModule, 
    InventoryModule, 
    PurchasesModule, 
    SalesModule, 
    ProductionModule, 
    PosModule, 
    CrmModule, 
    ContactsModule, 
    CampaignsModule, 
    CollectionsModule, 
    PayrollModule, 
    EmployeesModule, 
    AttendanceModule, 
    LiquidationsModule, 
    ProjectsModule, 
    TimesheetsModule, 
    SubcontractorsModule, 
    LegalModule, 
    TaxCalendarModule, 
    RegulatoryAlertsModule, 
    ComplianceModule, 
    ReportsModule, 
    BusinessIntelligenceModule, 
    BenchmarkingModule, 
    FinancialSimulatorModule, 
    AiAssistantModule, 
    AiReconciliationModule, 
    AiAnomalyDetectionModule, 
    AiDocumentProcessorModule, 
    AiTaxAdvisorModule, 
    AiProjectionsModule, 
    AiScoringModule, 
    AgentSriModule, 
    AgentIessModule, 
    AgentBanksModule, 
    AgentSuperciasModule, 
    AgentCrudModule, 
    AgentStudioModule, 
    SkillsFinancialModule, 
    SkillsSriModule, 
    SkillsDocumentsModule, 
    SkillsCommunicationModule, 
    SkillsCrudModule, 
    ChannelWhatsappModule, 
    ChannelTelegramModule, 
    ChannelEmailModule, 
    ChannelPortalModule, 
    IntegrationsModule, 
    IntegrationBanksModule, 
    IntegrationPaymentsModule, 
    IntegrationLogisticsModule, 
    IntegrationMarketplaceModule, 
    IntegrationBceModule, 
    QueuesModule, 
    NotificationsModule, 
    AuditModule, 
    StorageModule, 
    SecurityModule,
    SupabaseModule,
    DatabaseModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
