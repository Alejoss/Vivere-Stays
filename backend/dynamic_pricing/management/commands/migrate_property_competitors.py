from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterable, Optional, Sequence, Tuple

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import IntegrityError, connection
from django.utils import timezone

from dynamic_pricing.models import Competitor, DpPropertyCompetitor, Property


class Command(BaseCommand):
    help = "Migrate legacy data from dynamic.dp_property_competitor into Django-managed DpPropertyCompetitor."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate the migration without writing to target tables.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="Limit rows processed (useful for testing).",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Rows to fetch per batch from the legacy table.",
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
                property_id,
                competitor_id,
                user_id,
                created_at,
                updated_at,
                deleted_at,
                only_follow
            FROM dynamic.dp_property_competitor
            ORDER BY id
        """

        stats = defaultdict(int)

        for batch in self._fetch_rows(query, limit, batch_size):
            for row in batch:
                stats["processed"] += 1
                identifier = str(row["id"])

                property_obj = Property.objects.filter(pk=row["property_id"]).first()
                if not property_obj:
                    stats["skipped_property"] += 1
                    self._log_skip(identifier, f"property {row['property_id']} not found")
                    continue

                competitor_obj = Competitor.objects.filter(pk=row["competitor_id"]).first()
                if not competitor_obj:
                    stats["skipped_competitor"] += 1
                    self._log_skip(identifier, f"competitor {row['competitor_id']} not found")
                    continue

                user_obj = User.objects.filter(pk=row["user_id"]).first()
                if not user_obj:
                    stats["skipped_user"] += 1
                    self._log_skip(identifier, f"user {row['user_id']} not found")
                    continue

                defaults = {
                    "property_id": property_obj,
                    "competitor": competitor_obj,
                    "user": user_obj,
                    "only_follow": row["only_follow"],
                    "deleted_at": self._aware(row["deleted_at"]),
                    "created_at": self._aware(row["created_at"]),
                    "updated_at": self._aware(row["updated_at"]),
                }

                try:
                    if dry_run:
                        exists = DpPropertyCompetitor.objects.filter(pk=row["id"]).exists()
                        action = "UPDATED" if exists else "CREATED"
                        stats[f"would_{action.lower()}"] += 1
                        self._log_action(identifier, action, dry_run=True)
                        continue

                    obj, created = DpPropertyCompetitor.objects.update_or_create(
                        id=row["id"],
                        defaults=defaults,
                    )

                    if created:
                        stats["created"] += 1
                        self._log_action(identifier, "CREATED")
                    else:
                        stats["updated"] += 1
                        self._log_action(identifier, "UPDATED")
                except IntegrityError as exc:
                    stats["errors"] += 1
                    self._log_error(identifier, exc)
                except Exception as exc:
                    stats["errors"] += 1
                    self._log_error(identifier, exc, unexpected=True)

        self._print_summary(stats, dry_run)

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
    def _aware(dt):
        if dt is None:
            return None
        if timezone.is_aware(dt):
            return dt
        return timezone.make_aware(dt, timezone.get_default_timezone())

    def _log_action(self, identifier: str, action: str, dry_run: bool = False):
        prefix = "[DRY-RUN]" if dry_run else ""
        message = f"{prefix}[{action}] property_competitor id={identifier}"
        if action == "UPDATED":
            if self.verbosity and self.verbosity > 1:
                self.stdout.write(message)
        else:
            self.stdout.write(self.style.SUCCESS(message))

    def _log_skip(self, identifier: str, reason: str):
        self.stdout.write(self.style.WARNING(f"[SKIPPED] property_competitor id={identifier}: {reason}"))

    def _log_error(self, identifier: str, exc: Exception, unexpected: bool = False):
        label = "ERROR" if unexpected else "INTEGRITY"
        self.stdout.write(self.style.ERROR(f"[{label}] property_competitor id={identifier}: {exc}"))

    def _print_summary(self, stats: Dict[str, int], dry_run: bool):
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Property competitor migration summary"))
        self.stdout.write(f"  processed: {stats.get('processed', 0)}")

        if dry_run:
            self.stdout.write(f"  would create: {stats.get('would_created', 0)}")
            self.stdout.write(f"  would update: {stats.get('would_updated', 0)}")
        else:
            self.stdout.write(f"  created: {stats.get('created', 0)}")
            self.stdout.write(f"  updated: {stats.get('updated', 0)}")

        self.stdout.write(f"  skipped (property missing): {stats.get('skipped_property', 0)}")
        self.stdout.write(f"  skipped (competitor missing): {stats.get('skipped_competitor', 0)}")
        self.stdout.write(f"  skipped (user missing): {stats.get('skipped_user', 0)}")
        self.stdout.write(f"  errors: {stats.get('errors', 0)}")

