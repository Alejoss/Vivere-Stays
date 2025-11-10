from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal
from typing import Callable, Dict, Iterable, Optional, Sequence, Tuple

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import IntegrityError, connection
from django.utils import timezone

from dynamic_pricing.models import (
    Competitor,
    DpDynamicIncrementsV2,
    DpLosReduction,
    DpLosSetup,
    DpMinimumSellingPrice,
    DpOfferIncrements,
    DpRoomRates,
    DpGeneralSettings,
    OverwritePriceHistory,
    Property,
)


@dataclass
class MigrationStats:
    name: str
    processed: int = 0
    created: int = 0
    updated: int = 0
    skipped: int = 0
    missing_property: int = 0
    missing_user: int = 0
    errors: int = 0

    def summary_lines(self) -> Iterable[str]:
        yield f"  processed: {self.processed}"
        yield f"  created: {self.created}"
        yield f"  updated: {self.updated}"
        yield f"  skipped: {self.skipped}"
        if self.missing_property:
            yield f"  missing property deps: {self.missing_property}"
        if self.missing_user:
            yield f"  missing user deps: {self.missing_user}"
        if self.errors:
            yield f"  errors: {self.errors}"


class Command(BaseCommand):
    help = "Copy data from dynamic.* legacy tables into Django-managed dynamic_pricing_* tables."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate the migration without writing to the target tables.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="Limit the number of rows processed per table (for testing).",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Rows to fetch per batch from the legacy tables.",
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        limit: Optional[int] = options["limit"]
        batch_size: int = options["batch_size"]
        self.verbosity = options.get("verbosity", 1)

        if dry_run:
            self.stdout.write(self.style.WARNING("Running in dry-run mode; no inserts/updates will be performed."))

        migrations: Sequence[Tuple[str, Callable[[bool, Optional[int], int], MigrationStats]]] = [
            ("General settings", self._migrate_general_settings),
            ("Competitors", self._migrate_competitors),
            ("Dynamic increments", self._migrate_dynamic_increments),
            ("Offer increments", self._migrate_offer_increments),
            ("LOS setup", self._migrate_los_setup),
            ("LOS reduction", self._migrate_los_reduction),
            ("Minimum selling price", self._migrate_minimum_selling_price),
            ("Room rates", self._migrate_room_rates),
            ("Overwrite price history", self._migrate_overwrite_history),
        ]

        overall = defaultdict(int)

        for label, func in migrations:
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(f"=== Migrating {label} ==="))
            stats = func(dry_run, limit, batch_size)
            for line in stats.summary_lines():
                self.stdout.write(line)
            overall["processed"] += stats.processed
            overall["created"] += stats.created
            overall["updated"] += stats.updated
            overall["skipped"] += stats.skipped
            overall["missing_property"] += stats.missing_property
            overall["missing_user"] += stats.missing_user
            overall["errors"] += stats.errors

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=== Migration complete ==="))
        self.stdout.write(f"processed total: {overall['processed']}")
        self.stdout.write(f"created total: {overall['created']}")
        self.stdout.write(f"updated total: {overall['updated']}")
        self.stdout.write(f"skipped total: {overall['skipped']}")
        if overall["missing_property"]:
            self.stdout.write(self.style.WARNING(f"missing property deps total: {overall['missing_property']}"))
        if overall["missing_user"]:
            self.stdout.write(self.style.WARNING(f"missing user deps total: {overall['missing_user']}"))
        if overall["errors"]:
            self.stdout.write(self.style.WARNING(f"errors total: {overall['errors']}"))

    # ---- General helpers -------------------------------------------------

    def _log_create(self, label: str, identifier: str):
        self.stdout.write(self.style.SUCCESS(f"[CREATED] {label}: {identifier}"))

    def _log_update(self, label: str, identifier: str):
        if self.verbosity and self.verbosity > 1:
            self.stdout.write(self.style.SUCCESS(f"[UPDATED] {label}: {identifier}"))

    def _log_skip(self, label: str, identifier: str, reason: str):
        self.stdout.write(self.style.WARNING(f"[SKIPPED] {label}: {identifier} ({reason})"))

    def _log_error(self, label: str, identifier: str, error: Exception):
        self.stdout.write(self.style.ERROR(f"[ERROR] {label}: {identifier} ({error})"))

    def _fetch_rows(
        self,
        query: str,
        limit: Optional[int],
        batch_size: int,
    ) -> Iterable[Tuple[Dict[str, object], ...]]:
        params: Sequence[object] = []
        if limit is not None:
            query = f"{query} LIMIT %s"
            params = [limit]

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            column_names = [col.name for col in cursor.description]
            while True:
                rows = cursor.fetchmany(batch_size)
                if not rows:
                    break
                yield tuple(dict(zip(column_names, row)) for row in rows)

    @staticmethod
    def _to_decimal(value: Optional[object]) -> Optional[Decimal]:
        if value is None:
            return None
        if isinstance(value, Decimal):
            return value
        return Decimal(value)

    @staticmethod
    def _to_float(value: Optional[object]) -> Optional[float]:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _to_int(value: Optional[object]) -> Optional[int]:
        if value is None:
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _aware(dt):
        if dt is None:
            return None
        if timezone.is_aware(dt):
            return dt
        return timezone.make_aware(dt, timezone.get_default_timezone())

    # ---- Per-table migrations -------------------------------------------

    def _migrate_general_settings(self, dry_run: bool, limit: Optional[int], batch_size: int) -> MigrationStats:
        stats = MigrationStats("general_settings")
        query = """
            SELECT
                property_id,
                user_id,
                min_competitors,
                comp_price_calculation,
                future_days_to_price,
                pricing_status,
                los_status,
                otas_price_diff,
                los_num_competitors,
                los_aggregation,
                created_at,
                updated_at
            FROM dynamic.dp_general_settings
            ORDER BY property_id
        """

        for batch in self._fetch_rows(query, limit, batch_size):
            for row in batch:
                stats.processed += 1
                property_obj = Property.objects.filter(pk=row["property_id"]).first()
                if not property_obj:
                    stats.skipped += 1
                    stats.missing_property += 1
                    self._log_skip("general_settings", row["property_id"], "property not found")
                    continue

                user_obj = User.objects.filter(pk=row["user_id"]).first()
                if not user_obj:
                    stats.skipped += 1
                    stats.missing_user += 1
                    self._log_skip("general_settings", row["property_id"], "user not found")
                    continue

                defaults = {
                    "user": user_obj,
                    "min_competitors": row["min_competitors"],
                    "comp_price_calculation": row["comp_price_calculation"],
                    "future_days_to_price": row["future_days_to_price"],
                    "pricing_status": row["pricing_status"],
                    "los_status": row["los_status"],
                    "otas_price_diff": self._to_float(row["otas_price_diff"]) or 0,
                    "los_num_competitors": row["los_num_competitors"],
                    "los_aggregation": row["los_aggregation"],
                    "created_at": self._aware(row["created_at"]),
                    "updated_at": self._aware(row["updated_at"]),
                }

                try:
                    if dry_run:
                        exists = DpGeneralSettings.objects.filter(property_id=property_obj).exists()
                        if exists:
                            stats.updated += 1
                        else:
                            stats.created += 1
                        continue

                    obj, created = DpGeneralSettings.objects.update_or_create(
                        property_id=property_obj,
                        defaults=defaults,
                    )
                    if created:
                        stats.created += 1
                        self._log_create("general_settings", obj.property_id_id)
                    else:
                        stats.updated += 1
                        self._log_update("general_settings", obj.property_id_id)
                except IntegrityError as exc:
                    stats.errors += 1
                    self._log_error("general_settings", row["property_id"], exc)
                except Exception as exc:
                    stats.errors += 1
                    self._log_error("general_settings", row["property_id"], exc)

        return stats

    def _migrate_competitors(self, dry_run: bool, limit: Optional[int], batch_size: int) -> MigrationStats:
        stats = MigrationStats("competitors")
        query = """
            SELECT
                competitor_id,
                competitor_name,
                booking_link,
                created_at,
                updated_at
            FROM dynamic.competitor
            ORDER BY competitor_id
        """

        for batch in self._fetch_rows(query, limit, batch_size):
            for row in batch:
                stats.processed += 1
                competitor_id = self._to_int(row["competitor_id"])
                if competitor_id is None:
                    stats.skipped += 1
                    self._log_skip("competitor", row["competitor_id"], "competitor_id not numeric")
                    continue

                defaults = {
                    "competitor_name": row["competitor_name"],
                    "booking_link": row["booking_link"],
                }

                try:
                    if dry_run:
                        exists = Competitor.objects.filter(pk=competitor_id).exists()
                        if exists:
                            stats.updated += 1
                        else:
                            stats.created += 1
                        continue

                    obj, created = Competitor.objects.update_or_create(
                        id=competitor_id,
                        defaults=defaults,
                    )
                    if created:
                        stats.created += 1
                        self._log_create("competitor", f"{competitor_id} ({obj.competitor_name})")
                    else:
                        stats.updated += 1
                        self._log_update("competitor", f"{competitor_id} ({obj.competitor_name})")
                except IntegrityError as exc:
                    stats.errors += 1
                    self._log_error("competitor", str(row["competitor_id"]), exc)
                except Exception as exc:
                    stats.errors += 1
                    self._log_error("competitor", str(row["competitor_id"]), exc)

        return stats

    def _migrate_dynamic_increments(self, dry_run: bool, limit: Optional[int], batch_size: int) -> MigrationStats:
        stats = MigrationStats("dp_dynamic_increments_v2")
        query = """
            SELECT
                id,
                property_id,
                user_id,
                occupancy_category,
                lead_time_category,
                increment_type,
                increment_value,
                created_at,
                updated_at
            FROM dynamic.dp_dynamic_increments_v2
            ORDER BY id
        """

        for batch in self._fetch_rows(query, limit, batch_size):
            for row in batch:
                stats.processed += 1
                property_obj = Property.objects.filter(pk=row["property_id"]).first()
                if not property_obj:
                    stats.skipped += 1
                    stats.missing_property += 1
                    self._log_skip("dynamic_increment", row["id"], "property not found")
                    continue

                user_obj = User.objects.filter(pk=row["user_id"]).first() if row["user_id"] else None

                defaults = {
                    "property": property_obj,
                    "user": user_obj,
                    "occupancy_category": row["occupancy_category"],
                    "lead_time_category": row["lead_time_category"],
                    "increment_type": row["increment_type"],
                    "increment_value": self._to_float(row["increment_value"]) or 0,
                    "created_at": self._aware(row["created_at"]),
                    "updated_at": self._aware(row["updated_at"]),
                }

                try:
                    if dry_run:
                        exists = DpDynamicIncrementsV2.objects.filter(pk=row["id"]).exists()
                        if exists:
                            stats.updated += 1
                        else:
                            stats.created += 1
                        continue

                    obj, created = DpDynamicIncrementsV2.objects.update_or_create(
                        id=row["id"],
                        defaults=defaults,
                    )
                    if created:
                        stats.created += 1
                        self._log_create("dynamic_increment", str(obj.id))
                    else:
                        stats.updated += 1
                        self._log_update("dynamic_increment", str(obj.id))
                except IntegrityError as exc:
                    stats.errors += 1
                    self._log_error("dynamic_increment", str(row["id"]), exc)
                except Exception as exc:
                    stats.errors += 1
                    self._log_error("dynamic_increment", str(row["id"]), exc)

        return stats

    def _migrate_offer_increments(self, dry_run: bool, limit: Optional[int], batch_size: int) -> MigrationStats:
        stats = MigrationStats("dp_offer_increments")
        query = """
            SELECT
                id,
                property_id,
                user_id,
                offer_name,
                valid_from,
                valid_until,
                applied_from_days,
                applied_until_days,
                increment_type,
                increment_value,
                created_at,
                updated_at
            FROM dynamic.dp_offer_increments
            ORDER BY id
        """

        for batch in self._fetch_rows(query, limit, batch_size):
            for row in batch:
                stats.processed += 1
                property_obj = Property.objects.filter(pk=row["property_id"]).first()
                if not property_obj:
                    stats.skipped += 1
                    stats.missing_property += 1
                    self._log_skip("offer_increment", row["id"], "property not found")
                    continue

                user_obj = User.objects.filter(pk=row["user_id"]).first()
                if not user_obj:
                    stats.skipped += 1
                    stats.missing_user += 1
                    self._log_skip("offer_increment", row["id"], "user not found")
                    continue

                defaults = {
                    "property": property_obj,
                    "user": user_obj,
                    "offer_name": row["offer_name"],
                    "valid_from": row["valid_from"],
                    "valid_until": row["valid_until"],
                    "applied_from_days": row["applied_from_days"],
                    "applied_until_days": row["applied_until_days"],
                    "increment_type": row["increment_type"],
                    "increment_value": self._to_int(row["increment_value"]) or 0,
                    "created_at": self._aware(row["created_at"]),
                    "updated_at": self._aware(row["updated_at"]),
                }

                try:
                    if dry_run:
                        exists = DpOfferIncrements.objects.filter(pk=row["id"]).exists()
                        if exists:
                            stats.updated += 1
                        else:
                            stats.created += 1
                        continue

                    obj, created = DpOfferIncrements.objects.update_or_create(
                        id=row["id"],
                        defaults=defaults,
                    )
                    if created:
                        stats.created += 1
                        self._log_create("offer_increment", str(obj.id))
                    else:
                        stats.updated += 1
                        self._log_update("offer_increment", str(obj.id))
                except IntegrityError as exc:
                    stats.errors += 1
                    self._log_error("offer_increment", str(row["id"]), exc)
                except Exception as exc:
                    stats.errors += 1
                    self._log_error("offer_increment", str(row["id"]), exc)

        return stats

    def _migrate_los_setup(self, dry_run: bool, limit: Optional[int], batch_size: int) -> MigrationStats:
        stats = MigrationStats("dp_los_setup")
        query = """
            SELECT
                id,
                property_id,
                user_id,
                valid_from,
                valid_until,
                day_of_week,
                los_value,
                created_at,
                updated_at
            FROM dynamic.dp_los_setup
            ORDER BY id
        """

        for batch in self._fetch_rows(query, limit, batch_size):
            for row in batch:
                stats.processed += 1
                property_obj = Property.objects.filter(pk=row["property_id"]).first()
                if not property_obj:
                    stats.skipped += 1
                    stats.missing_property += 1
                    self._log_skip("los_setup", row["id"], "property not found")
                    continue

                user_obj = User.objects.filter(pk=row["user_id"]).first()
                if not user_obj:
                    stats.skipped += 1
                    stats.missing_user += 1
                    self._log_skip("los_setup", row["id"], "user not found")
                    continue

                defaults = {
                    "property": property_obj,
                    "user": user_obj,
                    "valid_from": row["valid_from"],
                    "valid_until": row["valid_until"],
                    "day_of_week": row["day_of_week"],
                    "los_value": row["los_value"],
                    "created_at": self._aware(row["created_at"]),
                    "updated_at": self._aware(row["updated_at"]),
                }

                try:
                    if dry_run:
                        exists = DpLosSetup.objects.filter(pk=row["id"]).exists()
                        if exists:
                            stats.updated += 1
                        else:
                            stats.created += 1
                        continue

                    obj, created = DpLosSetup.objects.update_or_create(
                        id=row["id"],
                        defaults=defaults,
                    )
                    if created:
                        stats.created += 1
                        self._log_create("los_setup", str(obj.id))
                    else:
                        stats.updated += 1
                        self._log_update("los_setup", str(obj.id))
                except IntegrityError as exc:
                    stats.errors += 1
                    self._log_error("los_setup", str(row["id"]), exc)
                except Exception as exc:
                    stats.errors += 1
                    self._log_error("los_setup", str(row["id"]), exc)

        return stats

    def _migrate_los_reduction(self, dry_run: bool, limit: Optional[int], batch_size: int) -> MigrationStats:
        stats = MigrationStats("dp_los_reduction")
        query = """
            SELECT
                id,
                property_id,
                user_id,
                occupancy_category,
                lead_time_category,
                los_value,
                created_at,
                updated_at
            FROM dynamic.dp_los_reduction
            ORDER BY id
        """

        for batch in self._fetch_rows(query, limit, batch_size):
            for row in batch:
                stats.processed += 1
                property_obj = Property.objects.filter(pk=row["property_id"]).first()
                if not property_obj:
                    stats.skipped += 1
                    stats.missing_property += 1
                    self._log_skip("los_reduction", row["id"], "property not found")
                    continue

                user_obj = User.objects.filter(pk=row["user_id"]).first() if row["user_id"] else None

                defaults = {
                    "property": property_obj,
                    "user": user_obj,
                    "occupancy_category": row["occupancy_category"],
                    "lead_time_category": row["lead_time_category"],
                    "los_value": row["los_value"],
                    "created_at": self._aware(row["created_at"]),
                    "updated_at": self._aware(row["updated_at"]),
                }

                try:
                    if dry_run:
                        exists = DpLosReduction.objects.filter(pk=row["id"]).exists()
                        if exists:
                            stats.updated += 1
                        else:
                            stats.created += 1
                        continue

                    obj, created = DpLosReduction.objects.update_or_create(
                        id=row["id"],
                        defaults=defaults,
                    )
                    if created:
                        stats.created += 1
                        self._log_create("los_reduction", str(obj.id))
                    else:
                        stats.updated += 1
                        self._log_update("los_reduction", str(obj.id))
                except IntegrityError as exc:
                    stats.errors += 1
                    self._log_error("los_reduction", str(row["id"]), exc)
                except Exception as exc:
                    stats.errors += 1
                    self._log_error("los_reduction", str(row["id"]), exc)

        return stats

    def _migrate_minimum_selling_price(self, dry_run: bool, limit: Optional[int], batch_size: int) -> MigrationStats:
        stats = MigrationStats("dp_minimum_selling_price")
        query = """
            SELECT
                id,
                property_id,
                user_id,
                valid_from,
                valid_until,
                msp,
                period_title,
                created_at,
                updated_at
            FROM dynamic.dp_minimum_selling_price
            ORDER BY id
        """

        for batch in self._fetch_rows(query, limit, batch_size):
            for row in batch:
                stats.processed += 1
                property_obj = Property.objects.filter(pk=row["property_id"]).first()
                if not property_obj:
                    stats.skipped += 1
                    stats.missing_property += 1
                    self._log_skip("minimum_selling_price", row["id"], "property not found")
                    continue

                user_obj = User.objects.filter(pk=row["user_id"]).first()
                if not user_obj:
                    stats.skipped += 1
                    stats.missing_user += 1
                    self._log_skip("minimum_selling_price", row["id"], "user not found")
                    continue

                defaults = {
                    "property": property_obj,
                    "user": user_obj,
                    "valid_from": row["valid_from"],
                    "valid_until": row["valid_until"],
                    "msp": row["msp"],
                    "period_title": row["period_title"],
                    "created_at": self._aware(row["created_at"]),
                    "updated_at": self._aware(row["updated_at"]),
                }

                try:
                    if dry_run:
                        exists = DpMinimumSellingPrice.objects.filter(pk=row["id"]).exists()
                        if exists:
                            stats.updated += 1
                        else:
                            stats.created += 1
                        continue

                    obj, created = DpMinimumSellingPrice.objects.update_or_create(
                        id=row["id"],
                        defaults=defaults,
                    )
                    if created:
                        stats.created += 1
                        self._log_create("minimum_selling_price", str(obj.id))
                    else:
                        stats.updated += 1
                        self._log_update("minimum_selling_price", str(obj.id))
                except IntegrityError as exc:
                    stats.errors += 1
                    self._log_error("minimum_selling_price", str(row["id"]), exc)
                except Exception as exc:
                    stats.errors += 1
                    self._log_error("minimum_selling_price", str(row["id"]), exc)

        return stats

    def _migrate_room_rates(self, dry_run: bool, limit: Optional[int], batch_size: int) -> MigrationStats:
        stats = MigrationStats("dp_room_rates")
        query = """
            SELECT
                id,
                property_id,
                user_id,
                rate_id,
                is_base_rate,
                increment_type,
                increment_value,
                created_at,
                updated_at
            FROM dynamic.dp_room_rates
            ORDER BY id
        """

        for batch in self._fetch_rows(query, limit, batch_size):
            for row in batch:
                stats.processed += 1
                property_obj = Property.objects.filter(pk=row["property_id"]).first()
                if not property_obj:
                    stats.skipped += 1
                    stats.missing_property += 1
                    self._log_skip("room_rate", row["id"], "property not found")
                    continue

                user_obj = User.objects.filter(pk=row["user_id"]).first()
                if not user_obj:
                    stats.skipped += 1
                    stats.missing_user += 1
                    self._log_skip("room_rate", row["id"], "user not found")
                    continue

                defaults = {
                    "property": property_obj,
                    "user": user_obj,
                    "rate_id": row["rate_id"],
                    "is_base_rate": row["is_base_rate"],
                    "increment_type": row["increment_type"],
                    "increment_value": self._to_float(row["increment_value"]) or 0,
                    "created_at": self._aware(row["created_at"]),
                    "updated_at": self._aware(row["updated_at"]),
                }

                try:
                    if dry_run:
                        exists = DpRoomRates.objects.filter(pk=row["id"]).exists()
                        if exists:
                            stats.updated += 1
                        else:
                            stats.created += 1
                        continue

                    obj, created = DpRoomRates.objects.update_or_create(
                        id=row["id"],
                        defaults=defaults,
                    )
                    if created:
                        stats.created += 1
                        self._log_create("room_rate", str(obj.id))
                    else:
                        stats.updated += 1
                        self._log_update("room_rate", str(obj.id))
                except IntegrityError as exc:
                    stats.errors += 1
                    self._log_error("room_rate", str(row["id"]), exc)
                except Exception as exc:
                    stats.errors += 1
                    self._log_error("room_rate", str(row["id"]), exc)

        return stats

    def _migrate_overwrite_history(self, dry_run: bool, limit: Optional[int], batch_size: int) -> MigrationStats:
        stats = MigrationStats("overwrite_price_history")
        query = """
            SELECT
                property_id,
                user_id,
                checkin_date,
                overwrite_price,
                updated_at
            FROM dynamic.overwrite_price_history
            ORDER BY property_id, checkin_date
        """

        for batch in self._fetch_rows(query, limit, batch_size):
            for row in batch:
                stats.processed += 1
                property_obj = Property.objects.filter(pk=row["property_id"]).first()
                if not property_obj:
                    stats.skipped += 1
                    stats.missing_property += 1
                    self._log_skip("overwrite_price", row["property_id"], "property not found")
                    continue

                user_obj = User.objects.filter(pk=row["user_id"]).first()
                if not user_obj:
                    stats.skipped += 1
                    stats.missing_user += 1
                    self._log_skip("overwrite_price", row["property_id"], "user not found")
                    continue

                defaults = {
                    "user": user_obj,
                    "overwrite_price": row["overwrite_price"],
                    "updated_at": self._aware(row["updated_at"]),
                }

                try:
                    if dry_run:
                        exists = OverwritePriceHistory.objects.filter(
                            property=property_obj,
                            checkin_date=row["checkin_date"],
                        ).exists()
                        if exists:
                            stats.updated += 1
                        else:
                            stats.created += 1
                        continue

                    obj, created = OverwritePriceHistory.objects.update_or_create(
                        property=property_obj,
                        checkin_date=row["checkin_date"],
                        defaults=defaults,
                    )
                    identifier = f"{obj.property_id_id} / {obj.checkin_date}"
                    if created:
                        stats.created += 1
                        self._log_create("overwrite_price", identifier)
                    else:
                        stats.updated += 1
                        self._log_update("overwrite_price", identifier)
                except IntegrityError as exc:
                    stats.errors += 1
                    identifier = f"{row['property_id']} / {row['checkin_date']}"
                    self._log_error("overwrite_price", identifier, exc)
                except Exception as exc:
                    stats.errors += 1
                    identifier = f"{row['property_id']} / {row['checkin_date']}"
                    self._log_error("overwrite_price", identifier, exc)

        return stats

