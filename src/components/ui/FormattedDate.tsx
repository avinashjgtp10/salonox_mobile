import { formatDateDDMMYYYY } from "../../utils/dateFormat";

type DateValue = Date | string | number | null | undefined;

export interface FormattedDateProps {
  value: DateValue;
  fallback?: string;
  className?: string;
  title?: string;
}

const FormattedDate = ({
  value,
  fallback = "-",
  className,
  title,
}: FormattedDateProps) => {
  if (value === null || value === undefined || value === "") {
    return <span className={className}>{fallback}</span>;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return <span className={className}>{fallback}</span>;
  }

  const formatted = formatDateDDMMYYYY(value);

  return (
    <span className={className} title={title}>
      {formatted}
    </span>
  );
};

export default FormattedDate;
