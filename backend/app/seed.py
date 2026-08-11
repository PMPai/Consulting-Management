"""Development seed data — creates a minimal working dataset.

Usage: python -m app.seed

Safety:
- Refuses to run unless ALLOW_SEED=true is set in env
- Refuses to run if the database already has organizations
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from app.auth.password import hash_password
from app.config import settings
from app.database import SessionLocal
from app.models.benefit_entry import BenefitEntry
from app.models.client import Client
from app.models.client_investment import ClientInvestment
from app.models.expense import Expense
from app.models.milestone import Milestone
from app.models.organization import Organization
from app.models.phase import Phase
from app.models.project import Project
from app.models.role_rate import RoleRate
from app.models.time_entry import TimeEntry
from app.models.user import User
from app.models.work_record import WorkRecord


def run_seed():
    if not settings.ALLOW_SEED:
        print("ALLOW_SEED is not true. Refusing to seed.")
        return

    db = SessionLocal()
    try:
        from sqlalchemy import func, select
        org_count = db.execute(select(func.count(Organization.id))).scalar()
        if org_count and org_count > 0:
            print("Database already has organizations. Refusing to seed.")
            return

        org = Organization(
            id=uuid4(),
            name="精铭数据演示组织",
            currency="CNY",
            default_timezone="Asia/Shanghai",
        )
        db.add(org)
        db.flush()

        owner = User(
            id=uuid4(),
            organization_id=org.id,
            email="admin@demo.com",
            name="管理员",
            role="owner",
            password_hash=hash_password("demo1234"),
            timezone="Asia/Shanghai",
            status="active",
        )
        consultant = User(
            id=uuid4(),
            organization_id=org.id,
            email="consultant@demo.com",
            name="顾问小王",
            role="consultant",
            password_hash=hash_password("demo1234"),
            timezone="Asia/Shanghai",
            status="active",
        )
        db.add_all([owner, consultant])
        db.flush()

        for role_name, cost, billing in [
            ("owner", Decimal("200"), Decimal("400")),
            ("assistant", Decimal("120"), Decimal("250")),
            ("consultant", Decimal("150"), Decimal("300")),
            ("viewer", Decimal("0"), Decimal("0")),
        ]:
            db.add(RoleRate(
                id=uuid4(),
                organization_id=org.id,
                role=role_name,
                internal_cost_rate=cost,
                client_billing_rate=billing,
            ))

        client = Client(
            id=uuid4(),
            organization_id=org.id,
            name="示例客户公司",
            code="DEMO-001",
            primary_contact="张经理",
            email="zhang@example.com",
            phone="13800000000",
            status="active",
            created_by=owner.id,
            updated_by=owner.id,
            version=1,
        )
        db.add(client)
        db.flush()

        project = Project(
            id=uuid4(),
            organization_id=org.id,
            client_id=client.id,
            name="数据平台实施项目",
            code="PRJ-001",
            owner_user_id=consultant.id,
            objective="为客户搭建数据分析和可视化平台",
            description="包含需求分析、数据管道搭建、仪表盘开发和培训",
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() + timedelta(days=60),
            status="active",
            billing_model="fixed_fee",
            total_quote=Decimal("80000"),
            final_goal="实现客户数据驱动决策能力，建立完整的数据分析和可视化体系",
            notes="客户对此项目期望较高，需注意里程碑按时交付",
            created_by=owner.id,
            updated_by=owner.id,
            version=1,
        )
        db.add(project)
        db.flush()

        phase1 = Phase(
            id=uuid4(),
            organization_id=org.id,
            project_id=project.id,
            name="需求分析",
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() - timedelta(days=15),
            status="completed",
            completion_pct=100,
            planned_hours=Decimal("40"),
            owner_user_id=consultant.id,
            color="#2563EB",
            display_order=0,
            kpi_definition="需求文档完成率 100%，客户签字确认",
            milestone_goal="交付需求规格说明书并获得客户签字",
            estimated_expense=Decimal("10000"),
            created_by=owner.id,
            updated_by=owner.id,
            version=1,
        )
        phase2 = Phase(
            id=uuid4(),
            organization_id=org.id,
            project_id=project.id,
            name="数据管道搭建",
            start_date=date.today() - timedelta(days=15),
            end_date=date.today() + timedelta(days=15),
            status="in_progress",
            completion_pct=60,
            planned_hours=Decimal("80"),
            owner_user_id=consultant.id,
            color="#0F766E",
            display_order=1,
            kpi_definition="数据管道日均处理量 ≥ 100万条，延迟 < 5分钟",
            milestone_goal="核心ETL管道上线运行，通过数据质量校验",
            estimated_expense=Decimal("30000"),
            created_by=owner.id,
            updated_by=owner.id,
            version=1,
        )
        phase3 = Phase(
            id=uuid4(),
            organization_id=org.id,
            project_id=project.id,
            name="仪表盘开发",
            start_date=date.today() + timedelta(days=15),
            end_date=date.today() + timedelta(days=45),
            status="not_started",
            completion_pct=0,
            planned_hours=Decimal("60"),
            owner_user_id=consultant.id,
            color="#D97706",
            display_order=2,
            kpi_definition="仪表盘页面 ≥ 10个，加载时间 < 3秒",
            milestone_goal="交付5个核心仪表盘并通过用户验收",
            estimated_expense=Decimal("25000"),
            created_by=owner.id,
            updated_by=owner.id,
            version=1,
        )
        db.add_all([phase1, phase2, phase3])
        db.flush()

        milestone1 = Milestone(
            id=uuid4(),
            organization_id=org.id,
            project_id=project.id,
            phase_id=phase1.id,
            name="需求确认",
            date=date.today() - timedelta(days=15),
            status="completed",
        )
        milestone2 = Milestone(
            id=uuid4(),
            organization_id=org.id,
            project_id=project.id,
            phase_id=phase2.id,
            name="数据管道上线",
            date=date.today() + timedelta(days=15),
            status="pending",
        )
        db.add_all([milestone1, milestone2])

        te1 = TimeEntry(
            id=uuid4(),
            organization_id=org.id,
            user_id=consultant.id,
            project_id=project.id,
            phase_id=phase1.id,
            work_date=datetime.now(timezone.utc) - timedelta(days=20),
            duration_minutes=480,
            billable=True,
            internal_cost_rate_snapshot=Decimal("150"),
            client_billing_rate_snapshot=Decimal("300"),
            labor_cost=Decimal("1200"),
            billable_amount=Decimal("2400"),
            source="manual",
            created_by=consultant.id,
            updated_by=consultant.id,
            version=1,
        )
        te2 = TimeEntry(
            id=uuid4(),
            organization_id=org.id,
            user_id=consultant.id,
            project_id=project.id,
            phase_id=phase2.id,
            work_date=datetime.now(timezone.utc) - timedelta(days=5),
            duration_minutes=360,
            billable=True,
            internal_cost_rate_snapshot=Decimal("150"),
            client_billing_rate_snapshot=Decimal("300"),
            labor_cost=Decimal("900"),
            billable_amount=Decimal("1800"),
            source="manual",
            created_by=consultant.id,
            updated_by=consultant.id,
            version=1,
        )
        db.add_all([te1, te2])
        db.flush()

        db.add(WorkRecord(
            id=uuid4(),
            organization_id=org.id,
            time_entry_id=te1.id,
            activity_summary="完成客户需求访谈和分析",
            activity_details="与客户团队进行3次访谈，整理需求文档",
            tags=["需求分析", "访谈"],
            visibility="internal",
        ))
        db.add(WorkRecord(
            id=uuid4(),
            organization_id=org.id,
            time_entry_id=te2.id,
            activity_summary="搭建数据管道核心模块",
            tags=["ETL", "数据管道"],
            visibility="internal",
        ))

        db.add(Expense(
            id=uuid4(),
            organization_id=org.id,
            project_id=project.id,
            phase_id=phase2.id,
            date=date.today() - timedelta(days=10),
            name="云服务器月费",
            category="cloud_services",
            supplier="AWS",
            amount=Decimal("500"),
            billable_to_client=True,
            created_by=consultant.id,
            updated_by=consultant.id,
            version=1,
        ))
        db.add(Expense(
            id=uuid4(),
            organization_id=org.id,
            project_id=project.id,
            date=date.today() - timedelta(days=5),
            name="AI工具订阅",
            category="ai_tools",
            supplier="OpenAI",
            amount=Decimal("200"),
            billable_to_client=False,
            created_by=consultant.id,
            updated_by=consultant.id,
            version=1,
        ))

        db.add(ClientInvestment(
            id=uuid4(),
            organization_id=org.id,
            project_id=project.id,
            date=date.today() - timedelta(days=30),
            investment_type="consulting_fees",
            amount=Decimal("50000"),
            description="咨询服务费",
            status="confirmed",
            created_by=owner.id,
            updated_by=owner.id,
            version=1,
        ))
        db.add(ClientInvestment(
            id=uuid4(),
            organization_id=org.id,
            project_id=project.id,
            date=date.today() - timedelta(days=20),
            investment_type="client_software",
            amount=Decimal("10000"),
            description="客户购买数据分析软件许可",
            status="confirmed",
            created_by=owner.id,
            updated_by=owner.id,
            version=1,
        ))

        db.add(BenefitEntry(
            id=uuid4(),
            organization_id=org.id,
            project_id=project.id,
            phase_id=phase1.id,
            benefit_name="报表自动化节省人力",
            benefit_type="labor_savings",
            observation_date=date.today() - timedelta(days=10),
            amount=Decimal("30000"),
            status="verified",
            notes="每月节省2人天，按月薪15000计算",
            verified_by=owner.id,
            verified_at=datetime.now(timezone.utc),
            created_by=owner.id,
            updated_by=owner.id,
            version=1,
        ))
        db.add(BenefitEntry(
            id=uuid4(),
            organization_id=org.id,
            project_id=project.id,
            benefit_name="预计数据驱动决策增收",
            benefit_type="incremental_revenue",
            observation_date=date.today() - timedelta(days=5),
            amount=Decimal("50000"),
            status="estimated",
            notes="预计年度增收（待验证）",
            created_by=owner.id,
            updated_by=owner.id,
            version=1,
        ))

        db.commit()
        print("Seed data created successfully!")
        print(f"  Organization: {org.name}")
        print("  Owner login: admin@demo.com / demo1234")
        print("  Consultant login: consultant@demo.com / demo1234")
        print(f"  Client: {client.name}")
        print(f"  Project: {project.name}")
        print(f"  Phases: {phase1.name}, {phase2.name}, {phase3.name}")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
