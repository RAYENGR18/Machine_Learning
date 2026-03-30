export default function ApiStatus({ status }) {
  const dotClass = `dot ${status === 'online' ? 'online' : status === 'offline' ? 'offline' : ''}`;
  const text =
    status === 'online'   ? 'API connected — ready to predict' :
    status === 'offline'  ? 'API offline — start FastAPI server first' :
    'Connecting to API…';

  return (
    <div className="api-status">
      <div className={dotClass} />
      <span>{text}</span>
    </div>
  );
}
