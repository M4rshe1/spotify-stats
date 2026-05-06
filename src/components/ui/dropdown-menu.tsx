"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronRightIcon } from "lucide-react";

type ButtonMenuVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;

export type DropdownMenuItemVariant = ButtonMenuVariant;

const dropdownMenuItemBase =
  "group/dropdown-menu-item cursor-pointer relative flex cursor-default items-center gap-2 rounded-none px-2 py-2 text-xs outline-hidden select-none data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const dropdownMenuItemVariantClasses: Record<ButtonMenuVariant, string> = {
  default: "focus:bg-accent focus:text-accent-foreground",
  outline:
    "border border-transparent focus:border-border focus:bg-muted focus:text-foreground dark:focus:bg-muted/50",
  secondary: "focus:bg-secondary focus:text-secondary-foreground",
  ghost: "focus:bg-muted focus:text-foreground dark:focus:bg-muted/50",
  destructive:
    "text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20 [&_svg]:text-destructive",
  ghostDestructive:
    "text-destructive focus:bg-destructive/20 focus:text-destructive dark:focus:bg-destructive/30 [&_svg]:text-destructive",
  ghostSecondary:
    "focus:bg-secondary/20 focus:text-secondary-foreground dark:focus:bg-secondary/30",
  ghostAccent:
    "focus:bg-accent/20 focus:text-accent-foreground dark:focus:bg-accent/30",
  ghostInfo:
    "focus:bg-info/20 focus:text-info-foreground dark:focus:bg-info/30",
  ghostSuccess:
    "focus:bg-success/20 focus:text-success-foreground dark:focus:bg-success/30",
  ghostWarning:
    "focus:bg-warning/20 focus:text-warning-foreground dark:focus:bg-warning/30",
  ghostLink:
    "text-primary underline-offset-4 focus:bg-muted/40 focus:text-primary focus:underline dark:focus:bg-muted/30",
  accent:
    "bg-accent/50 text-accent-foreground focus:bg-accent focus:text-accent-foreground",
  info: "text-info-foreground focus:bg-info/15 focus:text-info-foreground dark:focus:bg-info/25",
  success:
    "text-success-foreground focus:bg-success/15 focus:text-success-foreground dark:focus:bg-success/25",
  warning:
    "text-warning-foreground focus:bg-warning/15 focus:text-warning-foreground dark:focus:bg-warning/25",
  link: "text-primary underline-offset-4 hover:underline focus:bg-transparent focus:text-primary",
};

const dropdownMenuItemVariants = cva(dropdownMenuItemBase, {
  variants: {
    variant: dropdownMenuItemVariantClasses,
  },
  defaultVariants: {
    variant: "default",
  },
});

const dropdownMenuSubTriggerBase =
  "flex cursor-default items-center gap-2 rounded-none px-2 py-2 text-xs outline-hidden select-none data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const dropdownMenuSubTriggerVariantClasses: Record<ButtonMenuVariant, string> =
  {
    default:
      "focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground",
    outline:
      "border border-transparent focus:border-border focus:bg-muted focus:text-foreground data-open:border-border data-open:bg-muted data-open:text-foreground dark:focus:bg-muted/50 dark:data-open:bg-muted/50",
    secondary:
      "focus:bg-secondary focus:text-secondary-foreground data-open:bg-secondary data-open:text-secondary-foreground",
    ghost:
      "focus:bg-muted focus:text-foreground data-open:bg-muted data-open:text-foreground dark:focus:bg-muted/50 dark:data-open:bg-muted/50",
    destructive:
      "text-destructive focus:bg-destructive/10 focus:text-destructive data-open:bg-destructive/10 data-open:text-destructive dark:focus:bg-destructive/20 dark:data-open:bg-destructive/20 [&_svg]:text-destructive",
    ghostDestructive:
      "text-destructive focus:bg-destructive/20 focus:text-destructive data-open:bg-destructive/20 data-open:text-destructive dark:focus:bg-destructive/30 dark:data-open:bg-destructive/30 [&_svg]:text-destructive",
    ghostSecondary:
      "focus:bg-secondary/20 focus:text-secondary-foreground data-open:bg-secondary/20 data-open:text-secondary-foreground dark:focus:bg-secondary/30 dark:data-open:bg-secondary/30",
    ghostAccent:
      "focus:bg-accent/20 focus:text-accent-foreground data-open:bg-accent/20 data-open:text-accent-foreground dark:focus:bg-accent/30 dark:data-open:bg-accent/30",
    ghostInfo:
      "focus:bg-info/20 focus:text-info-foreground data-open:bg-info/20 data-open:text-info-foreground dark:focus:bg-info/30 dark:data-open:bg-info/30",
    ghostSuccess:
      "focus:bg-success/20 focus:text-success-foreground data-open:bg-success/20 data-open:text-success-foreground dark:focus:bg-success/30 dark:data-open:bg-success/30",
    ghostWarning:
      "focus:bg-warning/20 focus:text-warning-foreground data-open:bg-warning/20 data-open:text-warning-foreground dark:focus:bg-warning/30 dark:data-open:bg-warning/30",
    ghostLink:
      "text-primary underline-offset-4 focus:bg-muted/40 focus:text-primary focus:underline data-open:bg-muted/40 data-open:text-primary data-open:underline dark:focus:bg-muted/30 dark:data-open:bg-muted/30",
    accent:
      "bg-accent/50 text-accent-foreground focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground",
    info: "text-info-foreground focus:bg-info/15 focus:text-info-foreground data-open:bg-info/15 data-open:text-info-foreground dark:focus:bg-info/25 dark:data-open:bg-info/25",
    success:
      "text-success-foreground focus:bg-success/15 focus:text-success-foreground data-open:bg-success/15 data-open:text-success-foreground dark:focus:bg-success/25 dark:data-open:bg-success/25",
    warning:
      "text-warning-foreground focus:bg-warning/15 focus:text-warning-foreground data-open:bg-warning/15 data-open:text-warning-foreground dark:focus:bg-warning/25 dark:data-open:bg-warning/25",
    link: "text-primary underline-offset-4 hover:underline focus:bg-transparent focus:text-primary data-open:bg-transparent data-open:text-primary",
  };

const dropdownMenuSubTriggerVariants = cva(dropdownMenuSubTriggerBase, {
  variants: {
    variant: dropdownMenuSubTriggerVariantClasses,
  },
  defaultVariants: {
    variant: "default",
  },
});

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  );
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "bg-popover text-popover-foreground ring-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 max-h-(--radix-dropdown-menu-content-available-height) w-(--radix-dropdown-menu-trigger-width) min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-none shadow-md ring-1 duration-100 data-[state=closed]:overflow-hidden",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: ButtonMenuVariant;
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(dropdownMenuItemVariants({ variant }), className)}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-none py-2 pr-8 pl-2 text-xs outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-none py-2 pr-8 pl-2 text-xs outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "text-muted-foreground px-2 py-2 text-xs data-inset:pl-7",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1 h-px", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest group-focus/dropdown-menu-item:text-current",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
  variant?: ButtonMenuVariant;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      data-variant={variant}
      className={cn(dropdownMenuSubTriggerVariants({ variant }), className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "bg-popover text-popover-foreground ring-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 min-w-[96px] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-none shadow-lg ring-1 duration-100",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  dropdownMenuItemVariants,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  dropdownMenuSubTriggerVariants,
  DropdownMenuSubContent,
};
