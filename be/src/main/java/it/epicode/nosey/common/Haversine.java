package it.epicode.nosey.common;

/**
 * Distanza fra due punti geografici (progettazione v4, sezione 0): usata per
 * ordinare gli eventi per distanza e per i controlli sul raggio dei POI.
 */
public final class Haversine {

	// Raggio medio della Terra: precisione sufficiente per ordinare/confrontare (non per navigare).
	private static final double RAGGIO_TERRA_KM = 6371.0;

	private Haversine() {
	}

	public static double km(double lat1, double lng1, double lat2, double lng2) {
		double dLat = Math.toRadians(lat2 - lat1);
		double dLng = Math.toRadians(lng2 - lng1);
		double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
				+ Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
				* Math.sin(dLng / 2) * Math.sin(dLng / 2);
		double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return RAGGIO_TERRA_KM * c;
	}
}
