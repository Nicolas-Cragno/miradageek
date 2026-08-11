import { useEffect, useMemo, useRef, useState } from "react";
import "./css/SearchableSelect.css";

const defaultLabel = (option) =>
  option.label ?? option.nombre ?? option.descripcion ?? option.id;

export default function SearchableSelect({
  options = [],
  value = "",
  onChange,
  getLabel = defaultLabel,
  placeholder = "Buscar...",
}) {
  const containerRef = useRef(null);
  const typingRef = useRef(false);
  const previousValueRef = useRef(value);
  const selected = options.find(
    (option) => String(option.id) === String(value),
  );
  const [query, setQuery] = useState(selected ? getLabel(selected) : "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (previousValueRef.current !== value) {
      if (selected) setQuery(getLabel(selected));
      else if (!typingRef.current) setQuery("");
      previousValueRef.current = value;
      typingRef.current = false;
    }
  }, [getLabel, selected, value]);

  useEffect(() => {
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("es");
    if (!search || selected) return options;
    return options.filter((option) =>
      String(getLabel(option)).toLocaleLowerCase("es").includes(search),
    );
  }, [getLabel, options, query, selected]);

  return (
    <div className="searchable-select" ref={containerRef}>
      <input
        type="search"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          typingRef.current = true;
          setQuery(event.target.value);
          onChange("");
          setOpen(true);
        }}
      />
      {open && (
        <div className="searchable-options">
          {filtered.length ? (
            filtered.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => {
                  typingRef.current = false;
                  onChange(option.id);
                  setQuery(getLabel(option));
                  setOpen(false);
                }}
              >
                {getLabel(option)}
              </button>
            ))
          ) : (
            <span>Sin coincidencias</span>
          )}
        </div>
      )}
    </div>
  );
}
