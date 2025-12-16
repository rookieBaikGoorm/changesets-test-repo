import { Card, Badge } from '@repo/ui';

export function About() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6">About Us</h1>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Our Mission</h2>
            <p className="text-gray-700">
              We are dedicated to building amazing web applications that make a difference.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Technologies</h2>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="primary">React</Badge>
              <Badge variant="success">TypeScript</Badge>
              <Badge variant="secondary">Vite</Badge>
              <Badge variant="danger">Tailwind CSS</Badge>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Version</h2>
            <Badge size="lg">v0.1.0</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
