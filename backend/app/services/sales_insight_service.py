from statistics import fmean, median


def sales_distribution_insight(amounts: list[float], source_sale_id: int | None = None) -> dict | None:
    if not amounts:
        return None

    mean = fmean(amounts)
    midpoint = float(median(amounts))
    if mean > midpoint:
        rule_code = "sales.mean_above_median"
        title = "Algunas ventas altas elevan el ticket promedio"
        description = "La media supera la mediana de las ventas completadas."
    elif mean < midpoint:
        rule_code = "sales.mean_below_median"
        title = "Los importes bajos reducen el ticket promedio"
        description = "La media está por debajo de la mediana de las ventas completadas."
    else:
        rule_code = "sales.mean_equals_median"
        title = "Promedio y valor central coinciden"
        description = "La media y la mediana están alineadas en las ventas completadas."

    return {
        "rule_code": rule_code,
        "title": title,
        "description": description,
        "severity": "info",
        "source": "completed_sales",
        "source_sale_id": source_sale_id,
        "evidence": {"sales_count": len(amounts), "mean": mean, "median": midpoint},
    }