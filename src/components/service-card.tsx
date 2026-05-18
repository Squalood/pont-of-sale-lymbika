"use client";

import { useState } from "react";
import { ServiceRateType } from "@/types/service";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Stethoscope, Clock, UserRound, Info } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface ServiceCardProps {
  service: ServiceRateType;
  onClick: (service: ServiceRateType) => void;
}

export function ServiceCard({ service, onClick }: ServiceCardProps) {
  const imageUrl = service.medical_service?.image?.url;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [descOpen, setDescOpen] = useState(false);

  if (!service.medical_service) return null;

  return (
    <Card
      className="flex h-full cursor-pointer flex-col p-4 transition-shadow hover:shadow-md"
      onClick={() => onClick(service)}
    >
      <div className="flex items-start justify-between">
        {imageUrl ? (
          <div className="relative h-10 w-10">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center rounded bg-muted">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={service.medical_service?.name}
              className={`h-10 w-10 rounded object-cover transition-opacity ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-50 text-blue-500">
            <Stethoscope className="h-5 w-5" />
          </div>
        )}
        <div className="flex items-center gap-1">
          {service.medical_service?.description && (
            <button
              onClick={(e) => { e.stopPropagation(); setDescOpen(true); }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Info className="h-4 w-4" />
            </button>
          )}
          <Badge
            variant="outline"
            className={`text-xs ${service.medical_service?.type === "consultation" ? "border-blue-300 text-blue-600" : "border-purple-300 text-purple-600"}`}
          >
            {service.medical_service?.type === "consultation" ? "Consulta" : "Procedimiento"}
          </Badge>
        </div>
      </div>
      <div>
        <h3
          className="mt-2 line-clamp-2 min-h-10 text-sm font-medium text-foreground"
          title={service.medical_service?.name}
        >
          {service.medical_service?.name}
        </h3>
        {service.doctor?.doctorName && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <UserRound className="h-3 w-3 shrink-0" />
            <span className="truncate">{service.doctor.doctorName}</span>
          </p>
        )}
      </div>
      <div className="mt-auto pt-2">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-primary">
            ${service.price.toFixed(2)}
          </span>
          {service.duration_min > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {service.duration_min} min
            </span>
          )}
        </div>

      </div>
      <Dialog open={descOpen} onOpenChange={setDescOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{service.medical_service?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {service.medical_service?.description}
          </p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
