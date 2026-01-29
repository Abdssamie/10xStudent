export default function ResumePage({ params }: { params: { id: string } }) {
  return (
    <div className="p-8">
      <h1 className="mb-4 text-3xl font-bold">Resume Builder</h1>
      <p className="text-gray-600">Resume ID: {params.id}</p>
      <p className="mt-2 text-gray-600">
        YAML editor and RenderCV preview will be implemented here
      </p>
    </div>
  )
}
