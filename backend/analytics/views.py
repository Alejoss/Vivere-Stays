import logging
from datetime import datetime, timedelta, date

from django.db.models import Avg, Sum
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DailyPerformance
from dynamic_pricing.models import Property

logger = logging.getLogger(__name__)


class SummaryView(APIView):
    """
    Analytics summary for a property over a date range.

    Query params:
    - from: YYYY-MM-DD (optional, default: first day of current month)
    - to: YYYY-MM-DD (optional, default: today)
    - pms_source: string (optional, default: any)
    - metric_type: string (optional, default: any)

    Note: Property is auto-selected as the first active property of the
    authenticated user's profile (no property_id parameter required),
    following the same pattern as the Occupancy endpoint.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Auto-select first active property for the authenticated user
            user_profile = request.user.profile
            prop = (
                user_profile.properties.filter(is_active=True)
                .order_by("created_at")
                .first()
            )
            if not prop:
                return Response({"message": "No active property found for the user"}, status=status.HTTP_404_NOT_FOUND)

            from_str = request.query_params.get("from")
            to_str = request.query_params.get("to")
            today = date.today()
            if from_str:
                start_date = datetime.fromisoformat(from_str).date()
            else:
                start_date = today.replace(day=1)
            end_date = datetime.fromisoformat(to_str).date() if to_str else today

            pms_source = request.query_params.get("pms_source")
            metric_type = request.query_params.get("metric_type")

            qs = DailyPerformance.objects.filter(
                property=prop,
                kpi_date__gte=start_date,
                kpi_date__lte=end_date,
            )
            if pms_source:
                qs = qs.filter(pms_source=pms_source)
            if metric_type:
                qs = qs.filter(metric_type=metric_type)

            agg = qs.aggregate(
                revenue=Sum("daily_revenue"),
                bookings=Sum("total_bookings"),
                room_nights=Sum("total_room_nights"),
                avg_adr=Avg("adr"),
                avg_revpar=Avg("revpar"),
                avg_occupancy=Avg("occupancy_rate"),
            )

            # Fallback zeros
            def d(v):
                return float(v) if v is not None else 0.0

            # Helper calculators for charts
            def _avg_adr(metric: str) -> float:
                res = qs.filter(metric_type=metric).aggregate(v=Avg("adr"))
                return round(float(res["v"]) if res["v"] is not None else 0.0, 1)

            def _revpar_like(metric: str) -> float:
                # sum(revenue) / sum(available_units)
                res = qs.filter(metric_type=metric).aggregate(r=Sum("daily_revenue"), a=Sum("available_units"))
                r = float(res["r"]) if res["r"] is not None else 0.0
                a = int(res["a"]) if res["a"] is not None else 0
                if a <= 0:
                    return 0.0
                return round((r / a), 1)

            def _delta_pct(cur: float, base: float):
                try:
                    return round(((cur - base) / base) * 100.0, 1) if base else None
                except Exception:
                    return None

            # Build charts payload
            adr_top_left = _avg_adr("actual")
            adr_top_right = _avg_adr("prev_year_actual")
            adr_bot_left = _avg_adr("bob")
            adr_bot_right = _avg_adr("prev_year_bob")

            revpar_top_left = _revpar_like("actual")
            revpar_top_right = _revpar_like("prev_year_actual")
            revpar_bot_left = _revpar_like("bob")
            revpar_bot_right = _revpar_like("prev_year_bob")

            # Revenue section per user spec matches RevPAR formula
            revenue_top_left = _revpar_like("actual")
            revenue_top_right = _revpar_like("prev_year_actual")
            revenue_bot_left = _revpar_like("bob")
            revenue_bot_right = _revpar_like("prev_year_bob")

            charts = {
                "adr": {
                    "top": {
                        "first": adr_top_left,
                        "second": adr_top_right,
                        "delta_pct": _delta_pct(adr_top_left, adr_top_right),
                    },
                    "bottom": {
                        "first": adr_bot_left,
                        "second": adr_bot_right,
                        "delta_pct": _delta_pct(adr_bot_left, adr_bot_right),
                    },
                },
                "revpar": {
                    "top": {
                        "first": revpar_top_left,
                        "second": revpar_top_right,
                        "delta_pct": _delta_pct(revpar_top_left, revpar_top_right),
                    },
                    "bottom": {
                        "first": revpar_bot_left,
                        "second": revpar_bot_right,
                        "delta_pct": _delta_pct(revpar_bot_left, revpar_bot_right),
                    },
                },
                "revenue": {
                    "top": {
                        "first": revenue_top_left,
                        "second": revenue_top_right,
                        "delta_pct": _delta_pct(revenue_top_left, revenue_top_right),
                    },
                    "bottom": {
                        "first": revenue_bot_left,
                        "second": revenue_bot_right,
                        "delta_pct": _delta_pct(revenue_bot_left, revenue_bot_right),
                    },
                },
            }

            response = {
                "charts": charts,
            }

            return Response(response, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in SummaryView: {e}", exc_info=True)
            return Response({"message": "Failed to load analytics summary", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PickupView(APIView):
    """
    Pickup series for last N days compared to same time last year (STLY).

    Query params:
    - days: int (1,3,7 default 7)
    - pms_source: string (optional)
    - metric_type: string (optional)
    - value: 'room_nights' | 'bookings' (optional, default 'room_nights')
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user_profile = request.user.profile
            prop = (
                user_profile.properties.filter(is_active=True)
                .order_by("created_at")
                .first()
            )
            if not prop:
                return Response({"message": "No active property found for the user"}, status=status.HTTP_404_NOT_FOUND)

            try:
                days = int(request.query_params.get("days", 7))
            except ValueError:
                days = 7
            days = max(1, min(days, 31))

            pms_source = request.query_params.get("pms_source")
            metric_type = request.query_params.get("metric_type")
            # Determine aggregation field based on optional `value` param
            value = request.query_params.get("value", "room_nights")
            if value not in ("room_nights", "bookings"):
                value = "room_nights"
            agg_field = "total_room_nights" if value == "room_nights" else "total_bookings"

            today = date.today()
            start = today - timedelta(days=days - 1)
            start_stly = start.replace(year=start.year - 1)
            end_stly = today.replace(year=today.year - 1)

            base_qs = DailyPerformance.objects.filter(property=prop)
            if pms_source:
                base_qs = base_qs.filter(pms_source=pms_source)
            if metric_type:
                base_qs = base_qs.filter(metric_type=metric_type)

            # Current period map
            cur_qs = (
                base_qs
                .filter(kpi_date__gte=start, kpi_date__lte=today)
                .values("kpi_date")
                .annotate(val=Sum(agg_field))
            )
            cur_map = {row["kpi_date"]: int(row["val"] or 0) for row in cur_qs}

            # STLY map for same relative calendar days (kept for totals parity, not returned per-point)
            stly_qs = (
                base_qs
                .filter(kpi_date__gte=start_stly, kpi_date__lte=end_stly)
                .values("kpi_date")
                .annotate(val=Sum(agg_field))
            )
            stly_map = {row["kpi_date"]: int(row["val"] or 0) for row in stly_qs}

            data = []
            # Decide output key name based on requested value
            out_key = "rooms_sold" if value == "room_nights" else "bookings_made"
            for i in range(days):
                d_cur = start + timedelta(days=i)
                d_stly = d_cur.replace(year=d_cur.year - 1)
                label = f"D-{days - 1 - i}" if i < days - 1 else "D-0"
                point = {
                    "name": label,
                    out_key: cur_map.get(d_cur, 0),
                    "date": str(d_cur),
                }
                data.append(point)

            # Also provide aggregates handy for tiles (compute from maps)
            total_current = sum(cur_map.get(start + timedelta(days=i), 0) for i in range(days))
            total_stly = 0
            for i in range(days):
                d_cur = start + timedelta(days=i)
                d_stly = d_cur.replace(year=d_cur.year - 1)
                total_stly += stly_map.get(d_stly, 0)

            return Response({
                "days": days,
                "series": data,
                "totals": {
                    "current": total_current,
                    "stly": total_stly,
                    "delta_pct": round(((total_current - total_stly) / total_stly) * 100, 1) if total_stly else None,
                },
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in PickupView: {e}", exc_info=True)
            return Response({"message": "Failed to load pickup data", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OccupancyView(APIView):
    """
    Occupancy chart values for a property over a date range.

    Left graph:
      - outer: sum(units_reserved) / sum(available_units) where metric_type = actual
      - inner: sum(units_reserved) / sum(available_units) where metric_type = prev_year_actual
    Right graph:
      - outer: sum(units_reserved) / sum(available_units) where metric_type = bob
      - inner: sum(units_reserved) / sum(available_units) where metric_type = prev_year_bob

    Query params:
    - from: YYYY-MM-DD (optional, default: first day of current month)
    - to: YYYY-MM-DD (optional, default: today)
    - pms_source: string (optional, default: any)
    Note: Property is auto-selected as the first active property of the authenticated user's profile.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Auto-select first active property for the authenticated user
            user_profile = request.user.profile
            prop = (
                user_profile.properties.filter(is_active=True)
                .order_by("created_at")
                .first()
            )
            if not prop:
                return Response({"message": "No active property found for the user"}, status=status.HTTP_404_NOT_FOUND)

            from_str = request.query_params.get("from")
            to_str = request.query_params.get("to")
            today = date.today()
            if from_str:
                start_date = datetime.fromisoformat(from_str).date()
            else:
                start_date = today.replace(day=1)
            end_date = datetime.fromisoformat(to_str).date() if to_str else today

            pms_source = request.query_params.get("pms_source")

            base_qs = DailyPerformance.objects.filter(
                property=prop,
                kpi_date__gte=start_date,
                kpi_date__lte=end_date,
            )
            if pms_source:
                base_qs = base_qs.filter(pms_source=pms_source)

            def ratio_for(metric: str) -> float:
                qs = base_qs.filter(metric_type=metric).aggregate(
                    units_reserved_sum=Sum("units_reserved"),
                    available_units_sum=Sum("available_units"),
                )
                u = int(qs["units_reserved_sum"] or 0)
                a = int(qs["available_units_sum"] or 0)
                if a <= 0:
                    return 0.0
                return round((u / a) * 100.0, 1)

            left_outer = ratio_for("actual")
            left_inner = ratio_for("prev_year_actual")
            right_outer = ratio_for("bob")
            right_inner = ratio_for("prev_year_bob")

            def delta_pct(outer: float, inner: float):
                try:
                    return round(((outer - inner) / inner) * 100.0, 1) if inner else None
                except Exception:
                    return None

            payload = {
                "range": {"from": str(start_date), "to": str(end_date)},
                "occupancy": {
                    "left": {
                        "outer": left_outer,
                        "inner": left_inner,
                        "delta_pct": delta_pct(left_outer, left_inner),
                    },
                    "right": {
                        "outer": right_outer,
                        "inner": right_inner,
                        "delta_pct": delta_pct(right_outer, right_inner),
                    },
                },
            }

            return Response(payload, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in OccupancyView: {e}", exc_info=True)
            return Response({"message": "Failed to load occupancy data", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

