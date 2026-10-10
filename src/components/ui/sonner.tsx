import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-line group-[.toaster]:border-l-4 group-[.toaster]:border-l-primary group-[.toaster]:rounded-md group-[.toaster]:",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-bold",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
