from collections import defaultdict
from decimal import Decimal
from typing import Dict, Iterable, Optional, Sequence, Tuple

from django.core.management.base import BaseCommand
from django.db import IntegrityError, connection, transaction
from django.utils import timezone

from dynamic_pricing.models import Property, PropertyManagementSystem


class Command(BaseCommand):
    help = "Migrate legacy rows from dynamic.property into dynamic_pricing_property."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Inspect legacy data without writing to Django-managed tables.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="Process only the first N rows from the legacy table.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Rows to load from the legacy table per batch.",
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        limit: Optional[int] = options["limit"]
        batch_size: int = options["batch_size"]
        self.verbosity = options.get("verbosity", 1)

        if dry_run:
            self.stdout.write(self.style.WARNING("Running in dry-run mode; no data will be written."))

        query = """
            SELECT
                id,
                name,
                pms_name,
                pms_hotel_id,
                spreadsheet_id,
                booking_hotel_url,
                city,
                country,
                rm_email,
                created_at,
                updated_at,
                is_active,
                pms_id,
                number_of_rooms,
                street_address,
                postal_code,
                state_province,
                phone_number,
                website,
                cif,
                property_type,
                latitude,
                longitude
            FROM dynamic.property
            ORDER BY id
        """

        params: Sequence[object] = []
        if limit is not None:
            query += " LIMIT %s"
            params = [limit]

        stats = defaultdict(int)
        missing_pms: Dict[str, int] = defaultdict(int)
        errors: Dict[str, str] = {}

        self.stdout.write(self.style.SUCCESS("Fetching legacy property rows..."))
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            column_names = [col.name for col in cursor.description]

            fetcher = self._row_iterator(cursor, column_names, batch_size)

            if dry_run:
                for batch in fetcher:
                    self._process_batch(batch, dry_run, stats, missing_pms, errors)
            else:
                with transaction.atomic():
                    for batch in fetcher:
                        self._process_batch(batch, dry_run, stats, missing_pms, errors)

        self._print_summary(stats, missing_pms, errors, dry_run)

    def _log(self, message: str, *, level: str = "info") -> None:
        if level == "error":
            self.stderr.write(self.style.ERROR(message))
        elif level == "warning":
            self.stdout.write(self.style.WARNING(message))
        else:
            self.stdout.write(message)

    def _verbose(self, message: str) -> None:
        if self.verbosity and self.verbosity > 1:
            self.stdout.write(message)

    def _row_iterator(
        self,
        cursor,
        column_names: Sequence[str],
        batch_size: int,
    ) -> Iterable[Tuple[Dict[str, object], ...]]:
        while True:
            rows = cursor.fetchmany(batch_size)
            if not rows:
                break
            yield tuple(dict(zip(column_names, row)) for row in rows)

    def _process_batch(
        self,
        batch: Tuple[Dict[str, object], ...],
        dry_run: bool,
        stats: Dict[str, int],
        missing_pms: Dict[str, int],
        errors: Dict[str, str],
    ) -> None:
        for row in batch:
            property_id = row["id"]
            stats["processed"] += 1

            target_data = self._build_property_payload(row)
            pms_instance = self._resolve_pms(row)

            if pms_instance is None and row.get("pms_name"):
                missing_pms[row["pms_name"]] += 1
                self._verbose(f"[{property_id}] PMS '{row['pms_name']}' not found; defaulting to NULL.")

            pms_id = pms_instance.id if pms_instance else None
            target_data["create_fields"]["pms_id"] = pms_id
            target_data["update_fields"]["pms_id"] = pms_id

            if dry_run:
                exists = Property.objects.filter(pk=property_id).exists()
                stats["would_update" if exists else "would_create"] += 1
                continue

            try:
                existing = Property.objects.filter(pk=property_id).first()
                if existing:
                    Property.objects.filter(pk=property_id).update(**target_data["update_fields"])
                    stats["updated"] += 1
                    self._verbose(f"[{property_id}] Updated existing property.")
                else:
                    create_fields = target_data["create_fields"]
                    Property.objects.create(**create_fields)
                    Property.objects.filter(pk=property_id).update(
                        created_at=target_data["timestamps"]["created_at"],
                        updated_at=target_data["timestamps"]["updated_at"],
                    )
                    stats["created"] += 1
                    self._verbose(f"[{property_id}] Created new property.")
            except IntegrityError as exc:
                stats["errors"] += 1
                errors[property_id] = str(exc)
                self._log(f"[{property_id}] Integrity error: {exc}", level="warning")
            except Exception as exc:  # broad catch to ensure migration continues
                stats["errors"] += 1
                errors[property_id] = str(exc)
                self._log(f"[{property_id}] Unexpected error: {exc}", level="warning")

    def _build_property_payload(self, row: Dict[str, object]) -> Dict[str, Dict[str, object]]:
        def to_decimal(value: Optional[object]) -> Optional[Decimal]:
            if value is None:
                return None
            if isinstance(value, Decimal):
                return value
            return Decimal(value)

        legacy_rooms = row.get("number_of_rooms")
        try:
            number_of_rooms = int(legacy_rooms)
        except (TypeError, ValueError):
            number_of_rooms = 0

        base_fields = {
            "id": row["id"],
            "name": row["name"],
            "pms_name": row.get("pms_name"),
            "pms_hotel_id": row.get("pms_hotel_id"),
            "spreadsheet_id": row.get("spreadsheet_id"),
            "booking_hotel_url": row.get("booking_hotel_url"),
            "city": row.get("city"),
            "country": row.get("country"),
            "rm_email": row.get("rm_email"),
            "is_active": row.get("is_active", True),
            "number_of_rooms": number_of_rooms,
            "street_address": row.get("street_address"),
            "postal_code": row.get("postal_code"),
            "state_province": row.get("state_province"),
            "phone_number": row.get("phone_number"),
            "website": row.get("website"),
            "cif": row.get("cif"),
            "property_type": row.get("property_type"),
            "latitude": to_decimal(row.get("latitude")),
            "longitude": to_decimal(row.get("longitude")),
        }

        timestamps = {
            "created_at": self._aware(row.get("created_at")),
            "updated_at": self._aware(row.get("updated_at")),
        }

        update_fields = base_fields.copy()
        update_fields.update(
            {
                "pms_name": base_fields["pms_name"],
                "pms_hotel_id": base_fields["pms_hotel_id"],
                "spreadsheet_id": base_fields["spreadsheet_id"],
                "booking_hotel_url": base_fields["booking_hotel_url"],
                "city": base_fields["city"],
                "country": base_fields["country"],
                "rm_email": base_fields["rm_email"],
                "is_active": base_fields["is_active"],
                "number_of_rooms": base_fields["number_of_rooms"],
                "street_address": base_fields["street_address"],
                "postal_code": base_fields["postal_code"],
                "state_province": base_fields["state_province"],
                "phone_number": base_fields["phone_number"],
                "website": base_fields["website"],
                "cif": base_fields["cif"],
                "property_type": base_fields["property_type"],
                "latitude": base_fields["latitude"],
                "longitude": base_fields["longitude"],
                "updated_at": timestamps["updated_at"],
            }
        )

        create_fields = base_fields.copy()
        create_fields.update(
            {
                "created_at": timestamps["created_at"],
                "updated_at": timestamps["updated_at"],
            }
        )

        # Remove id from update fields because update() uses the PK for lookup.
        update_fields.pop("id", None)

        return {
            "create_fields": create_fields,
            "update_fields": update_fields,
            "timestamps": timestamps,
        }

    def _resolve_pms(self, row: Dict[str, object]) -> Optional[PropertyManagementSystem]:
        legacy_pms_id = row.get("pms_id")
        legacy_pms_name = (row.get("pms_name") or "").strip()

        if legacy_pms_id:
            pms = PropertyManagementSystem.objects.filter(id=legacy_pms_id).first()
            if pms:
                return pms

        if legacy_pms_name:
            pms = PropertyManagementSystem.objects.filter(name__iexact=legacy_pms_name).first()
            if pms:
                return pms

        return None

    @staticmethod
    def _aware(dt):
        if dt is None:
            return None
        if timezone.is_aware(dt):
            return dt
        return timezone.make_aware(dt, timezone.get_default_timezone())

    def _print_summary(
        self,
        stats: Dict[str, int],
        missing_pms: Dict[str, int],
        errors: Dict[str, str],
        dry_run: bool,
    ) -> None:
        if dry_run:
            created_key = "would_create"
            updated_key = "would_update"
        else:
            created_key = "created"
            updated_key = "updated"

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Property migration summary"))
        self.stdout.write(f"  processed: {stats.get('processed', 0)}")
        self.stdout.write(f"  {created_key}: {stats.get(created_key, 0)}")
        self.stdout.write(f"  {updated_key}: {stats.get(updated_key, 0)}")
        self.stdout.write(f"  errors: {stats.get('errors', 0)}")

        if missing_pms:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Properties with unresolved PMS references (set to NULL):"))
            for name, count in sorted(missing_pms.items()):
                label = name or "(missing name)"
                self.stdout.write(f"  - {label}: {count}")

        if errors:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Records with errors:"))
            for property_id, error in errors.items():
                self.stdout.write(f"  - {property_id}: {error}")

