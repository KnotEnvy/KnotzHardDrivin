"""Build the independently designed traffic family through the vehicle authoring pipeline."""
from pathlib import Path
_VEHICLE_SELECTION='traffic-'+_TRAFFIC_ONLY if globals().get('_TRAFFIC_ONLY') else 'traffic'
_vehicle_source=Path(__file__).with_name('build_vehicle_assets.py')
exec(compile(_vehicle_source.read_text(),str(_vehicle_source),'exec'),globals())
